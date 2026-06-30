// pg-backed loaders for Communication Coordinator data.
//
// Replaces the synchronous JSON reads in src/lib/data.ts for live use —
// JSON files remain on disk for backfill / fallback only. Server-side only.

import { getPool } from '@/lib/db';
import type {
  CommunicationCase,
  CommunicationMessage,
  CommunicationExtractedFacts,
} from '@/types';

interface CaseRow {
  id: string;
  application: CommunicationCase['application'];
  application_context: Record<string, unknown>;
  state: CommunicationCase['state'];
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  case_id: string;
  direction: CommunicationMessage['direction'];
  channel: string;
  sender: string | null;
  recipient: string | null;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  rfc822_message_id: string | null;
  in_reply_to: string | null;
  imap_uid: string | null;
  sent_at: string | null;
  received_at: string | null;
  agent_drafted: boolean;
  approved_by: string | null;
  approved_at: string | null;
}

interface FactsRow {
  id: string;
  message_id: string;
  classification: string;
  classification_confidence: string | null; // numeric arrives as string from pg
  classification_reasoning: string | null;
  extracted_facts: Record<string, unknown>;
  candidate_results: unknown[];
  recommended_next_action: string | null;
  recommended_action_label: string | null;
  cascade_outputs: Record<string, unknown> | null;
}

function rowToCase(r: CaseRow): CommunicationCase {
  return {
    id: r.id,
    application: r.application,
    application_context: r.application_context as CommunicationCase['application_context'],
    state: r.state,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToMessage(r: MessageRow): CommunicationMessage {
  return {
    id: r.id,
    case_id: r.case_id,
    direction: r.direction,
    channel: r.channel as CommunicationMessage['channel'],
    sender: r.sender ?? '',
    recipient: r.recipient ?? '',
    recipient_name: r.recipient_name ?? undefined,
    subject: r.subject ?? '',
    body: r.body,
    sent_at: r.sent_at,
    received_at: r.received_at,
    agent_drafted: r.agent_drafted,
    approved_by: r.approved_by,
    approved_at: r.approved_at,
  };
}

function rowToFacts(r: FactsRow): CommunicationExtractedFacts {
  return {
    id: r.id,
    message_id: r.message_id,
    classification: r.classification as CommunicationExtractedFacts['classification'],
    classification_confidence:
      r.classification_confidence === null ? 0 : Number(r.classification_confidence),
    classification_reasoning: r.classification_reasoning ?? '',
    extracted_facts: r.extracted_facts as Record<string, string>,
    candidate_results: r.candidate_results as CommunicationExtractedFacts['candidate_results'],
    recommended_next_action: r.recommended_next_action as CommunicationExtractedFacts['recommended_next_action'],
    recommended_action_label: r.recommended_action_label ?? '',
    cascade_outputs: (r.cascade_outputs ?? null) as CommunicationExtractedFacts['cascade_outputs'],
  };
}

export async function loadCommunicationCase(
  id: string,
): Promise<CommunicationCase | undefined> {
  const { rows } = await getPool().query<CaseRow>(
    `SELECT id, application, application_context, state, created_at, updated_at
     FROM comm_coordinator.cases
     WHERE id = $1`,
    [id],
  );
  return rows[0] ? rowToCase(rows[0]) : undefined;
}

export async function loadCommunicationCaseForRequest(
  requestId: string,
): Promise<CommunicationCase | undefined> {
  const { rows } = await getPool().query<CaseRow>(
    `SELECT id, application, application_context, state, created_at, updated_at
     FROM comm_coordinator.cases
     WHERE application_context->>'request_id' = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [requestId],
  );
  return rows[0] ? rowToCase(rows[0]) : undefined;
}

export async function loadCommunicationCaseByVin(
  vin: string,
): Promise<CommunicationCase | undefined> {
  const { rows } = await getPool().query<CaseRow>(
    `SELECT id, application, application_context, state, created_at, updated_at
     FROM comm_coordinator.cases
     WHERE application_context->>'vin' = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [vin],
  );
  return rows[0] ? rowToCase(rows[0]) : undefined;
}

export async function loadMessageById(
  messageId: string,
): Promise<CommunicationMessage | undefined> {
  const { rows } = await getPool().query<MessageRow>(
    `SELECT id, case_id, direction, channel, sender, recipient, recipient_name,
            subject, body, rfc822_message_id, in_reply_to, imap_uid,
            sent_at, received_at, agent_drafted, approved_by, approved_at
     FROM comm_coordinator.messages
     WHERE id = $1`,
    [messageId],
  );
  return rows[0] ? rowToMessage(rows[0]) : undefined;
}

export async function persistExtractedFacts(
  facts: CommunicationExtractedFacts,
): Promise<void> {
  await getPool().query(
    `INSERT INTO comm_coordinator.extracted_facts
       (id, message_id, classification, classification_confidence,
        classification_reasoning, extracted_facts, candidate_results,
        recommended_next_action, recommended_action_label, cascade_outputs)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
     ON CONFLICT (id) DO UPDATE SET
        classification = EXCLUDED.classification,
        classification_confidence = EXCLUDED.classification_confidence,
        classification_reasoning = EXCLUDED.classification_reasoning,
        extracted_facts = EXCLUDED.extracted_facts,
        candidate_results = EXCLUDED.candidate_results,
        recommended_next_action = EXCLUDED.recommended_next_action,
        recommended_action_label = EXCLUDED.recommended_action_label,
        cascade_outputs = EXCLUDED.cascade_outputs`,
    [
      facts.id,
      facts.message_id,
      facts.classification,
      facts.classification_confidence,
      facts.classification_reasoning,
      JSON.stringify(facts.extracted_facts ?? {}),
      JSON.stringify(facts.candidate_results ?? []),
      facts.recommended_next_action ?? null,
      facts.recommended_action_label ?? null,
      facts.cascade_outputs ? JSON.stringify(facts.cascade_outputs) : null,
    ],
  );
}

// Strip any trailing " [#NNNN]" run-ID marker, then re-stamp with the
// current run id. Without this, dynamically-drafted outbounds (cascade reply,
// clarification draft) ship without a marker while the seeded outbounds on
// the same case carry one — replies to the marker-less drafts fall through
// the imap.ts findCaseId guard and get rejected. Keeping the marker
// consistent across every outbound in a run is what makes the marker-based
// fallback work end-to-end.
//
// run_counter = 0 means the case has never been reset; we leave the subject
// alone in that case so we don't introduce a marker the IMAP guard would
// then treat as "mid-run" against unstamped seed text.
function applyRunMarker(subject: string, runCounter: number): string {
  if (runCounter <= 0) return subject;
  const stripped = subject.replace(/ \[#\d{2,6}\]$/, '');
  return `${stripped} [#${String(runCounter).padStart(4, '0')}]`;
}

// Upsert an outbound on a case by deterministic id. Used for CASE-MC-001,
// where the 2nd outbound (MSG-MC-OUT-002) is no longer seeded — Izzy creates
// it live during parse_inbound_reply and re-drafts it across runs. On INSERT
// the recipient/recipient_name are pulled from the case's application_context;
// sender is pulled from SMTP_USER env var (falls back to izzy@example.com).
// On UPDATE only subject/body/agent_drafted are overwritten — sent_at,
// approved_*, and rfc822_message_id are preserved so a concurrent re-parse
// can't un-send a live message.
//
// The subject is stamped with the case's current run-ID marker so the
// dynamically-drafted outbound stays in sync with whatever the reset
// endpoint stamped on the rest of the case.
//
// Returns the message id on success, or null if the case row can't be loaded
// (callers should fall back to updateNextPendingOutbound or log + skip).
export async function upsertCoordinatorOutbound(
  caseId: string,
  outboundId: string,
  subject: string,
  body: string,
): Promise<string | null> {
  const pool = getPool();
  const caseRow = await pool.query<{
    application_context: Record<string, unknown>;
    run_counter: number;
  }>(
    `SELECT application_context, run_counter FROM comm_coordinator.cases WHERE id = $1`,
    [caseId],
  );
  if (caseRow.rows.length === 0) return null;
  const ctx = caseRow.rows[0].application_context as {
    consumer_email?: string;
    consumer_name?: string;
  };
  const recipient = ctx.consumer_email ?? null;
  const recipientName = ctx.consumer_name ?? null;
  const stampedSubject = applyRunMarker(subject, caseRow.rows[0].run_counter);

  const senderEmail = process.env.SMTP_USER ?? 'izzy@example.com';
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO comm_coordinator.messages
       (id, case_id, direction, channel, sender, recipient, recipient_name,
        subject, body, sent_at, received_at, agent_drafted, approved_by, approved_at)
     VALUES ($1, $2, 'outbound', 'email', $7, $3, $4, $5, $6,
             NULL, NULL, true, NULL, NULL)
     ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        agent_drafted = true
     RETURNING id`,
    [outboundId, caseId, recipient, recipientName, stampedSubject, body, senderEmail],
  );
  return rows[0]?.id ?? null;
}

// Overwrites the body + subject of the next unsent outbound on a case. Used
// by the VIN scenario, which still relies on the seed-JSON outbound rows
// staying in place — only the content swaps. Subject is re-stamped with the
// case's current run-ID marker so the IMAP cron's marker-based fallback
// keeps working. Returns the id of the updated message, or null if no unsent
// outbound exists.
export async function updateNextPendingOutbound(
  caseId: string,
  subject: string,
  body: string,
): Promise<string | null> {
  const pool = getPool();
  const caseRow = await pool.query<{ run_counter: number }>(
    `SELECT run_counter FROM comm_coordinator.cases WHERE id = $1`,
    [caseId],
  );
  const runCounter = caseRow.rows[0]?.run_counter ?? 0;
  const stampedSubject = applyRunMarker(subject, runCounter);

  const { rows } = await pool.query<{ id: string }>(
    `UPDATE comm_coordinator.messages
        SET subject = $2, body = $3, agent_drafted = true
      WHERE id = (
        SELECT id FROM comm_coordinator.messages
         WHERE case_id = $1 AND direction = 'outbound' AND sent_at IS NULL
         ORDER BY COALESCE(received_at, NOW()) ASC
         LIMIT 1
      )
      RETURNING id`,
    [caseId, stampedSubject, body],
  );
  return rows[0]?.id ?? null;
}

export async function loadCommunicationMessagesForCase(
  caseId: string,
): Promise<CommunicationMessage[]> {
  const { rows } = await getPool().query<MessageRow>(
    `SELECT id, case_id, direction, channel, sender, recipient, recipient_name,
            subject, body, rfc822_message_id, in_reply_to, imap_uid,
            sent_at, received_at, agent_drafted, approved_by, approved_at
     FROM comm_coordinator.messages
     WHERE case_id = $1
     ORDER BY COALESCE(sent_at, received_at, created_at) ASC`,
    [caseId],
  );
  return rows.map(rowToMessage);
}

export async function loadExtractedFactsForMessage(
  messageId: string,
): Promise<CommunicationExtractedFacts | undefined> {
  const { rows } = await getPool().query<FactsRow>(
    `SELECT id, message_id, classification, classification_confidence,
            classification_reasoning, extracted_facts, candidate_results,
            recommended_next_action, recommended_action_label, cascade_outputs
     FROM comm_coordinator.extracted_facts
     WHERE message_id = $1
     LIMIT 1`,
    [messageId],
  );
  return rows[0] ? rowToFacts(rows[0]) : undefined;
}

export interface CoordinatorCaseBundle {
  case: CommunicationCase;
  messages: CommunicationMessage[];
  facts: Record<string, CommunicationExtractedFacts>; // keyed by message id
}

export async function loadCoordinatorCaseBundle(lookup: {
  caseId?: string;
  requestId?: string;
  vin?: string;
}): Promise<CoordinatorCaseBundle | undefined> {
  let c: CommunicationCase | undefined;
  if (lookup.caseId) c = await loadCommunicationCase(lookup.caseId);
  if (!c && lookup.requestId) c = await loadCommunicationCaseForRequest(lookup.requestId);
  if (!c && lookup.vin) c = await loadCommunicationCaseByVin(lookup.vin);
  if (!c) return undefined;

  const messages = await loadCommunicationMessagesForCase(c.id);
  const factsList = await Promise.all(
    messages.map(async (m) => [m.id, await loadExtractedFactsForMessage(m.id)] as const),
  );
  const facts: Record<string, CommunicationExtractedFacts> = {};
  for (const [mid, f] of factsList) {
    if (f) facts[mid] = f;
  }
  return { case: c, messages, facts };
}

// ─── Operator-inquiry helpers (Izzy email-handler) ───────────────────
//
// Operator-inquiry cases are created on-the-fly when an authorized sender
// (per IZZY_EMAIL_ALLOWLIST) emails the privacy mailbox with a fresh ask.
// One case per email thread (matched via In-Reply-To for follow-ups, but
// for v1 each new ask creates a fresh case).

function genCaseId(prefix: string): string {
  // 8-char hex per case — collision odds are negligible for the demo scale.
  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return `${prefix}-${hex.toUpperCase()}`;
}

export async function createOperatorInquiryCase(
  sender: string,
  subject: string,
): Promise<{ caseId: string }> {
  const caseId = genCaseId('CASE-ASK');
  await getPool().query(
    `INSERT INTO comm_coordinator.cases
       (id, application, application_context, state, created_at, updated_at)
     VALUES ($1, 'operator_inquiry', $2::jsonb, 'reply_received', NOW(), NOW())`,
    [caseId, JSON.stringify({ sender, original_subject: subject })],
  );
  return { caseId };
}

export interface OperatorInquiryThread {
  case: CommunicationCase;
  inbound: CommunicationMessage | null;
  outbound: CommunicationMessage | null;
}

export async function loadOperatorInquiryThreads(
  limit = 50,
): Promise<OperatorInquiryThread[]> {
  const { rows: caseRows } = await getPool().query<CaseRow>(
    `SELECT id, application, application_context, state, created_at, updated_at
     FROM comm_coordinator.cases
     WHERE application = 'operator_inquiry'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  const threads: OperatorInquiryThread[] = [];
  for (const r of caseRows) {
    const c = rowToCase(r);
    const messages = await loadCommunicationMessagesForCase(c.id);
    const inbound = messages.find((m) => m.direction === 'inbound') ?? null;
    const outbound = messages.find((m) => m.direction === 'outbound') ?? null;
    threads.push({ case: c, inbound, outbound });
  }
  return threads;
}
