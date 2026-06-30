/**
 * End-to-end test: insert a fresh outbound draft for CASE-MC-001, then call
 * the /api/coordinator/messages/:id/send route to actually send it via SMTP.
 *
 * The email lands in EMAIL_OVERRIDE_TO (maria.chen.com). When the user
 * replies, the IMAP cron worker should match the reply via In-Reply-To and
 * insert an inbound row into comm_coordinator.messages.
 *
 * Usage: npx tsx scripts/send_e2e_test.ts [BASE_URL]
 *
 * Defaults to http://localhost:3000.
 */
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

loadEnv({ path: '.env.local' });

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const CASE_ID = 'CASE-MC-001';
const DRAFT_ID = `MSG-MC-OUT-E2E-${Date.now().toString(36).toUpperCase()}`;

async function main() {
  const url = process.env.DATABASE_URL_FOR_ALEMBIC;
  if (!url) throw new Error('DATABASE_URL_FOR_ALEMBIC not set');

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  console.log(`Inserting fresh draft ${DRAFT_ID} on case ${CASE_ID}…`);
  // Pull the case's actual consumer_email so the test stays in sync with
  // whatever the demo data says today (e.g. maria.chen.com).
  const caseRow = await pool.query<{ consumer_email: string; consumer_name: string }>(
    `SELECT application_context->>'consumer_email' AS consumer_email,
            application_context->>'consumer_name'  AS consumer_name
     FROM comm_coordinator.cases WHERE id = $1`,
    [CASE_ID],
  );
  const recipient = caseRow.rows[0]?.consumer_email;
  const recipientName = caseRow.rows[0]?.consumer_name;
  if (!recipient) {
    throw new Error(`No consumer_email on case ${CASE_ID}`);
  }

  await pool.query(
    `INSERT INTO comm_coordinator.messages
       (id, case_id, direction, channel, sender, recipient, recipient_name,
        subject, body, agent_drafted)
     VALUES ($1, $2, 'outbound', 'email',
             'privacy@examplemotors.com', $5, $6,
             $3, $4, true)`,
    [
      DRAFT_ID,
      CASE_ID,
      `Instrata Coordinator e2e test — REQ-MC-REPLY (${DRAFT_ID})`,
      'Hi Maria,\n\n' +
        'This is an end-to-end test of the Communication Coordinator outbound→inbound loop.\n\n' +
        'Please reply to this email with anything (one word is fine). Your reply will:\n' +
        '  1. Land in our shared privacy mailbox at example.com\n' +
        '  2. Be matched to this case via the In-Reply-To header\n' +
        '  3. Be ingested into comm_coordinator.messages by the cron worker\n' +
        '  4. Appear in the InboundReplyReview UI for the Maria Chen scenario\n\n' +
        'Thanks,\n' +
        'Instrata Privacy Operations',
      recipient,
      recipientName,
    ],
  );

  await pool.end();

  console.log(`Calling ${BASE_URL}/api/coordinator/messages/${DRAFT_ID}/send…`);
  const res = await fetch(`${BASE_URL}/api/coordinator/messages/${DRAFT_ID}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved_by: 'operator@instrata.com' }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Send failed: HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }
  const data = JSON.parse(text);
  console.log('Sent.');
  console.log(`  message_id          : ${data.message_id}`);
  console.log(`  rfc822_message_id   : ${data.rfc822_message_id}`);
  console.log(`  delivered_to        : ${data.delivered_to}`);
  console.log(`  original_recipient  : ${data.original_recipient}`);
  console.log(`  sent_at             : ${data.sent_at}`);
  console.log('');
  console.log(`Now reply to that email from ${data.delivered_to}.`);
  console.log('Then run:');
  console.log(`  curl -X POST -H "Authorization: Bearer $CRON_SECRET" \\`);
  console.log(`       ${BASE_URL}/api/cron/ingest-replies`);
}

main().catch((err) => {
  console.error('e2e setup failed:', err);
  process.exit(1);
});
