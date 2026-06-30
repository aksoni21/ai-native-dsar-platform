/**
 * Force-overwrite the seed rows that backfill_coordinator.ts would have
 * skipped under ON CONFLICT DO NOTHING. Use after editing message bodies or
 * facts in the JSON for messages whose IDs already exist in pg.
 *
 * Idempotent — re-running is safe.
 *
 * Usage (from repo root):
 *   npx tsx scripts/resync_coordinator_seed.ts
 */
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

import casesJson from '../src/data/communication_cases.json';
import messagesJson from '../src/data/communication_messages.json';
import factsJson from '../src/data/communication_extracted_facts.json';

loadEnv({ path: '.env.local' });

const url = process.env.DATABASE_URL_FOR_ALEMBIC;
if (!url) {
  console.error('DATABASE_URL_FOR_ALEMBIC not set in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

interface CaseRow {
  id: string;
  application: 'orphan_vin' | 'consumer_dsar';
  application_context: Record<string, unknown>;
  state: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  case_id: string;
  direction: 'outbound' | 'inbound';
  channel: string;
  sender?: string | null;
  recipient?: string | null;
  recipient_name?: string | null;
  subject?: string | null;
  body: string;
  sent_at?: string | null;
  received_at?: string | null;
  agent_drafted: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
}

interface FactsRow {
  id: string;
  message_id: string;
  classification: string;
  classification_confidence?: number | null;
  classification_reasoning?: string | null;
  extracted_facts: Record<string, unknown>;
  candidate_results: unknown[];
  recommended_next_action?: string | null;
  recommended_action_label?: string | null;
  cascade_outputs?: Record<string, unknown> | null;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let casesUpserted = 0;
    for (const c of casesJson as CaseRow[]) {
      const r = await client.query(
        `INSERT INTO comm_coordinator.cases
           (id, application, application_context, state, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           application = EXCLUDED.application,
           application_context = EXCLUDED.application_context,
           state = EXCLUDED.state,
           updated_at = EXCLUDED.updated_at`,
        [
          c.id,
          c.application,
          JSON.stringify(c.application_context ?? {}),
          c.state,
          c.created_at,
          c.updated_at,
        ],
      );
      casesUpserted += r.rowCount ?? 0;
    }

    let messagesUpserted = 0;
    for (const m of messagesJson as MessageRow[]) {
      // ON CONFLICT preserves operator progress: sent_at, approved_*,
      // rfc822_message_id, in_reply_to, imap_uid are operational state
      // owned by the send route and the IMAP cron, not the seed JSON.
      // Editing a body and re-running resync should NOT wipe a sent send.
      const r = await client.query(
        `INSERT INTO comm_coordinator.messages
           (id, case_id, direction, channel, sender, recipient, recipient_name,
            subject, body, sent_at, received_at, agent_drafted,
            approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           case_id = EXCLUDED.case_id,
           direction = EXCLUDED.direction,
           channel = EXCLUDED.channel,
           sender = EXCLUDED.sender,
           recipient = EXCLUDED.recipient,
           recipient_name = EXCLUDED.recipient_name,
           subject = EXCLUDED.subject,
           body = EXCLUDED.body,
           agent_drafted = EXCLUDED.agent_drafted`,
        [
          m.id,
          m.case_id,
          m.direction,
          m.channel ?? 'email',
          m.sender ?? null,
          m.recipient ?? null,
          m.recipient_name ?? null,
          m.subject ?? null,
          m.body,
          m.sent_at ?? null,
          m.received_at ?? null,
          m.agent_drafted ?? false,
          m.approved_by ?? null,
          m.approved_at ?? null,
        ],
      );
      messagesUpserted += r.rowCount ?? 0;
    }

    let factsUpserted = 0;
    let factsSkipped = 0;
    for (const f of factsJson as FactsRow[]) {
      // Skip facts whose message_id no longer exists in messages — happens
      // when an inbound was reset/deleted (FK violation otherwise). The
      // simulate-reply endpoint will re-insert the canned message + facts
      // pair on demand.
      const present = await client.query<{ id: string }>(
        `SELECT id FROM comm_coordinator.messages WHERE id = $1`,
        [f.message_id],
      );
      if (present.rows.length === 0) {
        factsSkipped += 1;
        continue;
      }
      const r = await client.query(
        `INSERT INTO comm_coordinator.extracted_facts
           (id, message_id, classification, classification_confidence,
            classification_reasoning, extracted_facts, candidate_results,
            recommended_next_action, recommended_action_label, cascade_outputs)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           message_id = EXCLUDED.message_id,
           classification = EXCLUDED.classification,
           classification_confidence = EXCLUDED.classification_confidence,
           classification_reasoning = EXCLUDED.classification_reasoning,
           extracted_facts = EXCLUDED.extracted_facts,
           candidate_results = EXCLUDED.candidate_results,
           recommended_next_action = EXCLUDED.recommended_next_action,
           recommended_action_label = EXCLUDED.recommended_action_label,
           cascade_outputs = EXCLUDED.cascade_outputs`,
        [
          f.id,
          f.message_id,
          f.classification,
          f.classification_confidence ?? null,
          f.classification_reasoning ?? null,
          JSON.stringify(f.extracted_facts ?? {}),
          JSON.stringify(f.candidate_results ?? []),
          f.recommended_next_action ?? null,
          f.recommended_action_label ?? null,
          f.cascade_outputs ? JSON.stringify(f.cascade_outputs) : null,
        ],
      );
      factsUpserted += r.rowCount ?? 0;
    }

    await client.query('COMMIT');

    console.log('Resync complete:');
    console.log(`  cases            upserted=${casesUpserted}`);
    console.log(`  messages         upserted=${messagesUpserted}`);
    console.log(`  extracted_facts  upserted=${factsUpserted} skipped_orphan=${factsSkipped}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Resync failed:', err);
  process.exit(1);
});
