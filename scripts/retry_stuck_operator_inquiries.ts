/**
 * Re-fire Izzy's operator-inquiry handler for cases that have an inbound
 * but no outbound (i.e. Izzy never replied). Sends the missed replies via
 * whatever transport `sendEmail` is currently configured for (Gmail API if
 * GMAIL_REFRESH_TOKEN is set, otherwise nodemailer SMTP).
 *
 * Connects to whatever pg is in DATABASE_URL_FOR_ALEMBIC — if that points
 * at prod Supabase in your .env.local, this will retry against prod.
 *
 * Usage:
 *   # List stuck cases (no outbound on operator_inquiry):
 *   npx tsx scripts/retry_stuck_operator_inquiries.ts --list
 *
 *   # Retry all stuck cases:
 *   npx tsx scripts/retry_stuck_operator_inquiries.ts --all
 *
 *   # Retry specific case IDs:
 *   npx tsx scripts/retry_stuck_operator_inquiries.ts CASE-ASK-20E15C33 CASE-ASK-27417EB6
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

// Dynamic imports happen inside main() so they run AFTER dotenv populates
// process.env — otherwise modules like @anthropic-ai/sdk that read env at
// construction time see an empty key and throw.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let getPool: any, runOperatorInquiryHandler: any, buildMessageId: any, sendEmail: any;

interface CaseRow {
  id: string;
  application: string;
  state: string;
  application_context: { sender?: string; original_subject?: string };
  created_at: string;
}

interface MessageRow {
  id: string;
  direction: 'inbound' | 'outbound';
  sender: string | null;
  subject: string | null;
  body: string;
  rfc822_message_id: string | null;
  sent_at: string | null;
  received_at: string | null;
}

async function findStuckCases(): Promise<CaseRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseRow>(
    `SELECT c.id, c.application, c.state, c.application_context, c.created_at
     FROM comm_coordinator.cases c
     WHERE c.application = 'operator_inquiry'
       AND NOT EXISTS (
         SELECT 1 FROM comm_coordinator.messages m
         WHERE m.case_id = c.id AND m.direction = 'outbound'
       )
     ORDER BY c.created_at ASC`,
  );
  return rows;
}

async function loadCaseMessages(caseId: string): Promise<MessageRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<MessageRow>(
    `SELECT id, direction, sender, subject, body, rfc822_message_id, sent_at, received_at
     FROM comm_coordinator.messages
     WHERE case_id = $1
     ORDER BY COALESCE(sent_at, received_at, created_at) DESC`,
    [caseId],
  );
  return rows;
}

async function retryCase(caseId: string): Promise<void> {
  const pool = getPool();
  const messages = await loadCaseMessages(caseId);
  const latestInbound = messages.find((m) => m.direction === 'inbound');
  if (!latestInbound) {
    console.log(`  skip ${caseId}: no inbound on case`);
    return;
  }
  const priorOutbound = messages.find((m) => m.direction === 'outbound');
  const priorInbound = messages
    .filter((m) => m.direction === 'inbound' && m.id !== latestInbound.id)
    .pop();
  const priorThread = priorOutbound
    ? {
        priorOutboundSubject: priorOutbound.subject ?? '(no subject)',
        priorOutboundBody: priorOutbound.body,
        priorInboundBody: priorInbound?.body,
      }
    : undefined;

  console.log(`  processing ${caseId}`);
  console.log(`    inbound: from=${latestInbound.sender} subject=${JSON.stringify(latestInbound.subject)}`);

  const reply = await runOperatorInquiryHandler({
    sender: latestInbound.sender ?? '',
    subject: latestInbound.subject ?? '(no subject)',
    body: latestInbound.body,
    priorThread,
  });

  const replyMsgId = `MSG-OUT-RETRY-${latestInbound.id.slice(-6)}`;
  const rfc822Out = buildMessageId(caseId, replyMsgId);

  const sendResult = await sendEmail({
    to: latestInbound.sender ?? '',
    subject: reply.subject,
    body: reply.body,
    messageId: rfc822Out,
    inReplyTo: latestInbound.rfc822_message_id ?? undefined,
  });

  const sentAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO comm_coordinator.messages
       (id, case_id, direction, channel, sender, recipient, recipient_name,
        subject, body, rfc822_message_id, in_reply_to,
        sent_at, agent_drafted, approved_by, approved_at)
     VALUES ($1, $2, 'outbound', 'email', $3, $4, $5, $6, $7, $8, $9,
             $10, true, 'agent:izzy', $10)`,
    [
      replyMsgId,
      caseId,
      process.env.SMTP_USER ?? process.env.GMAIL_USER_EMAIL ?? 'izzy@example.com',
      latestInbound.sender ?? '',
      null,
      reply.subject,
      reply.body,
      rfc822Out,
      latestInbound.rfc822_message_id,
      sentAt,
    ],
  );
  await pool.query(
    `UPDATE comm_coordinator.cases SET state = 'resolved', updated_at = NOW() WHERE id = $1`,
    [caseId],
  );

  console.log(`    sent ${replyMsgId} → ${sendResult.deliveredTo}`);
  console.log(`    tools=${reply.toolsUsed.join(',')} iterations=${reply.iterations}`);
}

async function main() {
  // Load modules now so they pick up the env that dotenv just populated.
  ({ getPool } = await import('../src/lib/db'));
  ({ runOperatorInquiryHandler } = await import('../src/lib/sub-agents/operator-inquiry-handler'));
  ({ buildMessageId, sendEmail } = await import('../src/lib/email/smtp'));

  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage:');
    console.log('  npx tsx scripts/retry_stuck_operator_inquiries.ts --list');
    console.log('  npx tsx scripts/retry_stuck_operator_inquiries.ts --all');
    console.log('  npx tsx scripts/retry_stuck_operator_inquiries.ts CASE-ASK-xxx CASE-ASK-yyy');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const pool = getPool();

  if (args.includes('--list')) {
    const stuck = await findStuckCases();
    console.log(`stuck operator_inquiry cases (no outbound): ${stuck.length}`);
    for (const c of stuck) {
      const ctx = c.application_context ?? {};
      console.log(`  ${c.id}  state=${c.state}  from=${ctx.sender ?? '?'}  subj=${JSON.stringify(ctx.original_subject ?? '?')}  created=${c.created_at}`);
    }
    await pool.end();
    return;
  }

  let targets: string[];
  if (args.includes('--all')) {
    const stuck = await findStuckCases();
    targets = stuck.map((c) => c.id);
    console.log(`retrying all ${targets.length} stuck cases…`);
  } else {
    targets = args.filter((a) => !a.startsWith('--'));
    console.log(`retrying ${targets.length} specified case(s)…`);
  }

  let ok = 0;
  let fail = 0;
  for (const caseId of targets) {
    try {
      await retryCase(caseId);
      ok += 1;
    } catch (err) {
      fail += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED ${caseId}: ${msg}`);
    }
  }
  console.log(`\ndone: ${ok} succeeded, ${fail} failed`);
  await pool.end();
}

main().catch((err) => {
  console.error('script failed:', err);
  process.exit(1);
});
