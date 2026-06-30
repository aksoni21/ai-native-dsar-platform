/**
 * One-shot backfill: copy the three communication-coordinator JSON files
 * into the comm_coordinator.* tables in Postgres.
 *
 * Idempotent — uses ON CONFLICT (id) DO NOTHING so re-running is safe and
 * won't clobber rows you've adjusted manually.
 *
 * Usage (from repo root):
 *   npx tsx scripts/backfill_coordinator.ts
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

type CaseRow = {
  id: string;
  application: 'orphan_vin' | 'consumer_dsar';
  application_context: Record<string, unknown>;
  state: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
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
};

type FactsRow = {
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
};

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let casesInserted = 0;
    for (const c of casesJson as CaseRow[]) {
      const r = await client.query(
        `INSERT INTO comm_coordinator.cases
           (id, application, application_context, state, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.application,
          JSON.stringify(c.application_context ?? {}),
          c.state,
          c.created_at,
          c.updated_at,
        ],
      );
      casesInserted += r.rowCount ?? 0;
    }

    let messagesInserted = 0;
    for (const m of messagesJson as MessageRow[]) {
      const r = await client.query(
        `INSERT INTO comm_coordinator.messages
           (id, case_id, direction, channel, sender, recipient, recipient_name,
            subject, body, sent_at, received_at, agent_drafted,
            approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
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
      messagesInserted += r.rowCount ?? 0;
    }

    let factsInserted = 0;
    for (const f of factsJson as FactsRow[]) {
      const r = await client.query(
        `INSERT INTO comm_coordinator.extracted_facts
           (id, message_id, classification, classification_confidence,
            classification_reasoning, extracted_facts, candidate_results,
            recommended_next_action, recommended_action_label, cascade_outputs)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
         ON CONFLICT (id) DO NOTHING`,
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
      factsInserted += r.rowCount ?? 0;
    }

    await client.query('COMMIT');

    console.log('Backfill complete:');
    console.log(`  cases            inserted=${casesInserted} skipped=${casesJson.length - casesInserted}`);
    console.log(`  messages         inserted=${messagesInserted} skipped=${messagesJson.length - messagesInserted}`);
    console.log(`  extracted_facts  inserted=${factsInserted} skipped=${factsJson.length - factsInserted}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
