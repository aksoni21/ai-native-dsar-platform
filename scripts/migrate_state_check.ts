/**
 * Make the comm_coordinator.cases.state CHECK constraint permissive to all
 * CoordinatorCaseState values in src/types/index.ts (some of them — like
 * 'resolved' — were added in TS but not on the pg constraint, causing
 * UPDATE failures from the new operator-inquiry handler).
 *
 * Idempotent.
 *
 * Usage:
 *   npx tsx scripts/migrate_state_check.ts
 */
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

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

async function run() {
  const client = await pool.connect();
  try {
    await client.query(
      `ALTER TABLE comm_coordinator.cases DROP CONSTRAINT IF EXISTS ck_cases_state`,
    );
    await client.query(
      `ALTER TABLE comm_coordinator.cases
       ADD CONSTRAINT ck_cases_state
       CHECK (state IN (
         'drafted',
         'approved',
         'sent',
         'awaiting_reply',
         'reply_received',
         'in_review',
         'resolved',
         'closed_no_response'
       ))`,
    );
    console.log('Migration complete: ck_cases_state now allows all 8 CoordinatorCaseState values.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
