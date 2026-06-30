/**
 * One-shot schema migration: add `cascade_outputs JSONB` to
 * comm_coordinator.extracted_facts.
 *
 * The cascade fan-out (identity-resolver + disposition-planner +
 * report-generator + consumer-reply-drafter) writes its four outputs onto the
 * facts row when an inbound classification of `provides_new_identity_info`
 * lands on a consumer_dsar case. The column is nullable; existing rows stay
 * NULL until a fresh parse runs.
 *
 * Idempotent — uses `ADD COLUMN IF NOT EXISTS`.
 *
 * Usage (from repo root):
 *   npx tsx scripts/migrate_cascade_outputs.ts
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
      `ALTER TABLE comm_coordinator.extracted_facts
       ADD COLUMN IF NOT EXISTS cascade_outputs JSONB`,
    );
    console.log('Migration complete: cascade_outputs column ensured.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
