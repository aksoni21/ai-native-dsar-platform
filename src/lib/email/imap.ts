// IMAP ingestion for Communication Coordinator inbound replies.
//
// Lives outside the MCP boundary. Polled by /api/cron/ingest-replies on a
// Railway Cron schedule (default every 60s). Reads UNSEEN messages from the
// shared privacy-ops mailbox, matches each to a case via In-Reply-To header
// (preferred) or a REQ-…/CASE-… subject token (fallback), and inserts an
// inbound row into comm_coordinator.messages.
//
// Idempotent — partial unique index on messages.imap_uid means re-running
// silently skips already-ingested mails.
//
// Server-side only.

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { PoolClient } from 'pg';

import { getPool } from '@/lib/db';
import { isAllowedEmailSender } from '@/lib/constants';
import { createOperatorInquiryCase } from '@/lib/coordinator-db';
import { runOperatorInquiryHandler } from '@/lib/sub-agents/operator-inquiry-handler';
import { buildMessageId, sendEmail } from '@/lib/email/smtp';

export interface IngestDetail {
  uid: number;
  status: 'ingested' | 'skipped' | 'error';
  reason?: string;
  message_id?: string;
  case_id?: string;
}

export interface IngestResult {
  ingested: number;
  skipped: number;
  errors: number;
  details: IngestDetail[];
}

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

function getConfig(): ImapConfig {
  const host = process.env.IMAP_HOST;
  const port = process.env.IMAP_PORT;
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASS;
  const missing = Object.entries({ IMAP_HOST: host, IMAP_PORT: port, IMAP_USER: user, IMAP_PASS: password })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing IMAP env vars: ${missing.join(', ')}`);
  }
  return {
    host: host!,
    port: Number(port),
    user: user!,
    password: password!,
  };
}

const CASE_TOKEN_RE = /(REQ-[A-Z0-9-]+|CASE-[A-Z0-9-]+)/i;
// Demo-run-ID marker injected by the reset endpoint. Two digits inside
// `[#NN]`. Gmail preserves the subject (with this marker) on replies, so it
// becomes a reliable signal for "this reply belongs to the current demo run."
// Accept 2-6 digit run-ID markers. The reset endpoint now emits 4-digit
// monotonic ids like [#0001], but older runs may have left 2-digit stamps
// in pg that we still want to recognize for back-compat.
const RUN_ID_RE = /\[#(\d{2,6})\]/;

async function findCaseId(
  pgClient: PoolClient,
  opts: { inReplyTo: string | null; subject: string | null },
): Promise<string | null> {
  // Preferred: In-Reply-To header → rfc822_message_id of an outbound row.
  if (opts.inReplyTo) {
    const { rows } = await pgClient.query<{ case_id: string }>(
      `SELECT case_id FROM comm_coordinator.messages WHERE rfc822_message_id = $1 LIMIT 1`,
      [opts.inReplyTo],
    );
    if (rows.length) return rows[0].case_id;
  }

  // Secondary: per-run subject marker `[#NN]`. The reset endpoint stamps a
  // fresh marker onto every outbound's subject; replies inherit it via the
  // standard "Re: " threading. Matches only when an outbound currently in DB
  // carries the same marker — so stale replies from a previous run (whose
  // outbound was either deleted or re-stamped) are intentionally skipped.
  if (opts.subject) {
    const runMatch = opts.subject.match(RUN_ID_RE);
    if (runMatch) {
      const marker = `[#${runMatch[1]}]`;
      const { rows } = await pgClient.query<{ case_id: string }>(
        `SELECT case_id FROM comm_coordinator.messages
         WHERE direction = 'outbound' AND subject LIKE $1
         ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 1`,
        [`%${marker}%`],
      );
      if (rows.length) return rows[0].case_id;
      // Marker is present but no current outbound carries it → this is a
      // stale-run reply. Skip rather than fall through to the REQ/CASE token
      // regex, which would attach it to the wrong run.
      return null;
    }
  }

  // Tertiary fallback: REQ-/CASE- token regex. Used for replies on flows that
  // haven't been reset yet (and thus carry no run-ID marker) — e.g. the
  // initial-state demo before any reset, or Tab 7 orphan-VIN cases where the
  // subject naturally embeds a CASE-/REQ- identifier.
  //
  // Guard: if the resolved case has any outbound already stamped with a
  // run-ID, refuse the match — that case is mid-run with markers, and this
  // marker-less reply is from a previous run.
  if (opts.subject) {
    const m = opts.subject.match(CASE_TOKEN_RE);
    if (m) {
      const token = m[1].toUpperCase();
      let candidate: string | null = null;
      if (token.startsWith('CASE-')) {
        const { rows } = await pgClient.query<{ id: string }>(
          `SELECT id FROM comm_coordinator.cases WHERE id = $1`,
          [token],
        );
        if (rows.length) candidate = rows[0].id;
      } else if (token.startsWith('REQ-')) {
        const { rows } = await pgClient.query<{ id: string }>(
          `SELECT id FROM comm_coordinator.cases
           WHERE application_context->>'request_id' = $1
           LIMIT 1`,
          [token],
        );
        if (rows.length) candidate = rows[0].id;
      }
      if (candidate) {
        const stampCheck = await pgClient.query(
          `SELECT 1 FROM comm_coordinator.messages
           WHERE case_id = $1 AND direction = 'outbound'
             AND subject ~ '\\[#[0-9]{2,6}\\]'
           LIMIT 1`,
          [candidate],
        );
        if (stampCheck.rowCount && stampCheck.rowCount > 0) return null;
        return candidate;
      }
    }
  }

  return null;
}

function genInboundId(): string {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, '0');
  return `MSG-IN-${hex}`;
}

export async function ingestReplies(): Promise<IngestResult> {
  const cfg = getConfig();
  const result: IngestResult = { ingested: 0, skipped: 0, errors: 0, details: [] };

  const imap = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
  });

  await imap.connect();
  const lock = await imap.getMailboxLock('INBOX');
  const pool = getPool();

  try {
    // Scan messages from the last 7 days regardless of \Seen state. Without
    // this, anything the operator opened in Gmail before the cron ran becomes
    // permanently invisible. The imap_uid dedup below prevents re-ingest.
    const sinceWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const uids = (await imap.search({ since: sinceWindow }, { uid: true })) as
      | number[]
      | false;
    if (!uids || uids.length === 0) {
      return result;
    }

    for (const uid of uids) {
      const pgClient = await pool.connect();
      try {
        // imap_uid dedup — partial unique index also enforces it on insert.
        const dup = await pgClient.query(
          `SELECT id FROM comm_coordinator.messages WHERE imap_uid = $1`,
          [String(uid)],
        );
        if (dup.rowCount && dup.rowCount > 0) {
          await imap.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
          result.skipped++;
          result.details.push({ uid, status: 'skipped', reason: 'already ingested' });
          continue;
        }

        const msg = await imap.fetchOne(
          String(uid),
          { source: true, envelope: true, internalDate: true },
          { uid: true },
        );
        if (!msg || !msg.source) {
          result.skipped++;
          result.details.push({ uid, status: 'skipped', reason: 'no source on fetch' });
          continue;
        }

        const parsed = await simpleParser(msg.source);
        const inReplyTo = parsed.inReplyTo ?? null;
        const subject = parsed.subject ?? null;
        const body = (parsed.text ?? parsed.html ?? '').toString().trim();
        const fromValue = Array.isArray(parsed.from?.value) ? parsed.from!.value[0] : undefined;
        const toValue = Array.isArray(parsed.to)
          ? parsed.to[0]?.value?.[0]
          : parsed.to?.value?.[0];
        const sender = fromValue?.address ?? '';
        const recipient = toValue?.address ?? '';
        const recipientName = toValue?.name || null;
        const receivedAt = new Date(msg.internalDate ?? Date.now()).toISOString();
        const rfc822 = parsed.messageId ?? null;

        let caseId = await findCaseId(pgClient, { inReplyTo, subject });
        let isOperatorInquiry = false;
        let priorThread:
          | { priorOutboundSubject: string; priorOutboundBody: string; priorInboundBody?: string }
          | undefined;
        if (!caseId) {
          // Reply-shape guard: a "Re:" subject means this is a reply to
          // something we sent — if we can't match it to a case, it's almost
          // certainly a Coordinator outbound whose Message-Id got rewritten
          // by Gmail and whose subject doesn't carry a [#NNNN] / REQ-/CASE-
          // token to fall back on. Auto-spawning an operator_inquiry here
          // would hijack the reply into a brand-new ASK case and Izzy would
          // reply to the recipient as if they'd asked her a question.
          // Better to skip and surface in the cron details.
          const looksLikeReply = !!subject && /^\s*re:/i.test(subject);
          if (looksLikeReply) {
            console.log(
              `[imap] skip uid=${uid} from=${sender} subject=${JSON.stringify(subject)} — Re: with no case match (likely Gmail Message-Id rewrite)`,
            );
            result.skipped++;
            result.details.push({
              uid,
              status: 'skipped',
              reason: 'reply-shaped subject but no case match — refusing to spawn operator_inquiry',
            });
            continue;
          }

          // No existing case and not a reply — check if this is an authorized
          // operator emailing Izzy ad-hoc. If so, spawn a new operator_inquiry
          // case; otherwise leave the message unread for human triage.
          if (isAllowedEmailSender(sender)) {
            const created = await createOperatorInquiryCase(sender, subject ?? '(no subject)');
            caseId = created.caseId;
            isOperatorInquiry = true;
            console.log(
              `[imap] new operator_inquiry case=${caseId} from=${sender} subject=${JSON.stringify(subject)}`,
            );
          } else {
            console.log(
              `[imap] skip uid=${uid} from=${sender} subject=${JSON.stringify(subject)} inReplyTo=${JSON.stringify(inReplyTo)}`,
            );
            result.skipped++;
            result.details.push({ uid, status: 'skipped', reason: 'no case match — sender not authorized — left unread' });
            continue;
          }
        } else {
          // Existing case matched — if it's an operator_inquiry, treat
          // this inbound as a multi-turn follow-up: fire the handler again
          // with the prior outbound + original inbound as thread context.
          const caseRow = await pgClient.query<{ application: string }>(
            `SELECT application FROM comm_coordinator.cases WHERE id = $1`,
            [caseId],
          );
          if (caseRow.rows[0]?.application === 'operator_inquiry') {
            isOperatorInquiry = true;
            const priorMsgs = await pgClient.query<{
              direction: string;
              subject: string | null;
              body: string;
              sent_at: string | null;
              received_at: string | null;
            }>(
              `SELECT direction, subject, body, sent_at, received_at
               FROM comm_coordinator.messages
               WHERE case_id = $1
               ORDER BY COALESCE(sent_at, received_at, created_at) DESC`,
              [caseId],
            );
            const priorOutbound = priorMsgs.rows.find((m) => m.direction === 'outbound');
            const priorInbound = priorMsgs.rows.find((m) => m.direction === 'inbound');
            if (priorOutbound) {
              priorThread = {
                priorOutboundSubject: priorOutbound.subject ?? '(no subject)',
                priorOutboundBody: priorOutbound.body,
                priorInboundBody: priorInbound?.body,
              };
            }
            console.log(
              `[imap] operator_inquiry follow-up case=${caseId} from=${sender} has_prior=${!!priorOutbound}`,
            );
          }
        }

        const newId = genInboundId();
        await pgClient.query(
          `INSERT INTO comm_coordinator.messages
             (id, case_id, direction, channel, sender, recipient, recipient_name,
              subject, body, rfc822_message_id, in_reply_to, imap_uid,
              received_at, agent_drafted)
           VALUES ($1, $2, 'inbound', 'email', $3, $4, $5, $6, $7, $8, $9, $10, $11, false)`,
          [
            newId,
            caseId,
            sender,
            recipient,
            recipientName,
            subject,
            body,
            rfc822,
            inReplyTo,
            String(uid),
            receivedAt,
          ],
        );
        await pgClient.query(
          `UPDATE comm_coordinator.cases
           SET state = 'reply_received', updated_at = NOW()
           WHERE id = $1`,
          [caseId],
        );
        await imap.messageFlagsAdd(uid, ['\\Seen'], { uid: true });

        result.ingested++;
        result.details.push({ uid, status: 'ingested', message_id: newId, case_id: caseId });

        // ─── Operator-inquiry handler ──────────────────────────────
        // For ad-hoc operator emails (new case from allowlisted sender),
        // run Izzy's email-handler sub-agent and send the reply back.
        if (isOperatorInquiry && caseId) {
          try {
            const reply = await runOperatorInquiryHandler({
              sender,
              subject: subject ?? '(no subject)',
              body,
              priorThread,
            });

            const replyMsgId = `MSG-OUT-${newId.slice(7)}`;
            const rfc822Out = buildMessageId(caseId, replyMsgId);

            await sendEmail({
              to: sender,
              subject: reply.subject,
              body: reply.body,
              messageId: rfc822Out,
              inReplyTo: rfc822 ?? undefined,
            });

            const sentAt = new Date().toISOString();
            await pgClient.query(
              `INSERT INTO comm_coordinator.messages
                 (id, case_id, direction, channel, sender, recipient, recipient_name,
                  subject, body, rfc822_message_id, in_reply_to,
                  sent_at, agent_drafted, approved_by, approved_at)
               VALUES ($1, $2, 'outbound', 'email', $3, $4, $5, $6, $7, $8, $9,
                       $10, true, 'agent:izzy', $10)`,
              [
                replyMsgId,
                caseId,
                process.env.SMTP_USER ?? 'izzy@example.com',
                sender,
                null,
                reply.subject,
                reply.body,
                rfc822Out,
                rfc822,
                sentAt,
              ],
            );
            await pgClient.query(
              `UPDATE comm_coordinator.cases SET state = 'resolved', updated_at = NOW() WHERE id = $1`,
              [caseId],
            );

            result.details.push({
              uid,
              status: 'ingested',
              reason: `operator_inquiry handled · tools=${reply.toolsUsed.join(',')} iterations=${reply.iterations}`,
              message_id: replyMsgId,
              case_id: caseId,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[imap] operator-inquiry handler failed for case=${caseId}:`, msg);
            result.errors++;
            result.details.push({
              uid,
              status: 'error',
              reason: `operator_inquiry handler failed: ${msg}`,
              case_id: caseId,
            });
          }
        }
      } catch (err) {
        result.errors++;
        const reason = err instanceof Error ? err.message : String(err);
        result.details.push({ uid, status: 'error', reason });
      } finally {
        pgClient.release();
      }
    }
  } finally {
    lock.release();
    await imap.logout();
  }

  return result;
}
