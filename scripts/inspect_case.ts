import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { Client } from 'pg';

const CASE_ID = process.argv[2] ?? 'CASE-MC-001';

interface Msg {
  id: string;
  direction: 'inbound' | 'outbound';
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  body: string;
  rfc822_message_id: string | null;
  in_reply_to: string | null;
  sent_at: string | null;
  received_at: string | null;
  agent_drafted: boolean | null;
  approved_by: string | null;
}

interface Facts {
  id: string;
  message_id: string;
  classification: string | null;
  classification_confidence: number | null;
  classification_reasoning: string | null;
  extracted_facts: unknown;
  candidate_results: unknown;
  recommended_next_action: string | null;
  recommended_action_label: string | null;
  cascade_outputs: unknown;
  created_at: string;
}

function trunc(s: string, n = 400): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + ` … [+${s.length - n} chars]` : s;
}

function tsKey(m: Msg): number {
  const v = m.sent_at || m.received_at;
  if (!v) return 0;
  return new Date(v).getTime();
}

async function main() {
  const url = process.env.DATABASE_URL_FOR_ALEMBIC;
  if (!url) {
    console.error('DATABASE_URL_FOR_ALEMBIC missing');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const caseRow = await client.query(
    `SELECT id, application, state, application_context, created_at, updated_at
       FROM comm_coordinator.cases WHERE id = $1`,
    [CASE_ID],
  );
  if (!caseRow.rowCount) {
    console.log(`No case ${CASE_ID}`);
    await client.end();
    return;
  }
  const c = caseRow.rows[0];
  console.log('━━━ CASE ━━━');
  console.log(`  id=${c.id}  application=${c.application}  state=${c.state}`);
  console.log(`  context=${JSON.stringify(c.application_context)}`);
  console.log(`  updated_at=${c.updated_at}`);

  const msgs = (
    await client.query<Msg>(
      `SELECT id, direction, sender, recipient, subject, body,
              rfc822_message_id, in_reply_to, sent_at, received_at,
              agent_drafted, approved_by
         FROM comm_coordinator.messages
        WHERE case_id = $1`,
      [CASE_ID],
    )
  ).rows.sort((a, b) => tsKey(a) - tsKey(b));

  console.log(`\n━━━ MESSAGES (${msgs.length}) ━━━`);
  for (const m of msgs) {
    const arrow = m.direction === 'outbound' ? '→' : '←';
    const ts = m.sent_at || m.received_at || '?';
    console.log(`\n  ${arrow} ${m.direction.toUpperCase()}  ${m.id}  ${ts}`);
    console.log(`    from: ${m.sender}`);
    console.log(`    to:   ${m.recipient}`);
    console.log(`    subj: ${m.subject}`);
    if (m.rfc822_message_id) console.log(`    rfc822: ${m.rfc822_message_id}`);
    if (m.in_reply_to) console.log(`    in-reply-to: ${m.in_reply_to}`);
    if (m.agent_drafted) console.log(`    agent_drafted: true`);
    if (m.approved_by) console.log(`    approved_by: ${m.approved_by}`);
    console.log(`    body: ${trunc(m.body)}`);
  }

  const facts = (
    await client.query<Facts>(
      `SELECT ef.id, ef.message_id, ef.classification,
              ef.classification_confidence, ef.classification_reasoning,
              ef.extracted_facts, ef.candidate_results,
              ef.recommended_next_action, ef.recommended_action_label,
              ef.cascade_outputs, ef.created_at
         FROM comm_coordinator.extracted_facts ef
         JOIN comm_coordinator.messages m ON m.id = ef.message_id
        WHERE m.case_id = $1
        ORDER BY ef.created_at ASC`,
      [CASE_ID],
    )
  ).rows;

  console.log(`\n━━━ EXTRACTED FACTS (${facts.length}) ━━━`);
  for (const f of facts) {
    console.log(`\n  facts for msg=${f.message_id}  created=${f.created_at}`);
    console.log(`    classification:        ${f.classification} (conf=${f.classification_confidence})`);
    if (f.classification_reasoning) {
      console.log(`    reasoning:             ${trunc(f.classification_reasoning, 600)}`);
    }
    console.log(`    recommended action:    ${f.recommended_action_label} [${f.recommended_next_action}]`);
    console.log(`    extracted_facts:\n${trunc(JSON.stringify(f.extracted_facts, null, 2), 1200).replace(/^/gm, '      ')}`);
    console.log(`    candidate_results:\n${trunc(JSON.stringify(f.candidate_results, null, 2), 800).replace(/^/gm, '      ')}`);
    if (f.cascade_outputs) {
      console.log(`    cascade_outputs:`);
      const co = f.cascade_outputs as Record<string, unknown>;
      for (const [agentName, payload] of Object.entries(co)) {
        console.log(`      • ${agentName}:`);
        console.log(`          ${trunc(JSON.stringify(payload, null, 2), 600).replace(/\n/g, '\n          ')}`);
      }
    } else {
      console.log(`    cascade_outputs:     (none)`);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
