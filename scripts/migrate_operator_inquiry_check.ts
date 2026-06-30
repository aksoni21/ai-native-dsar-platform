/**
 * Allow `'operator_inquiry'` as a valid `application` value on
 * comm_coordinator.cases. The original CHECK constraint only permits
 * 'orphan_vin' | 'consumer_dsar'; this migration drops it and adds a
 * permissive replacement that includes the new value.
 *
 * Idempotent.
 *
 * Usage:
 *   npx tsx scripts/migrate_operator_inquiry_check.ts
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
    // Drop the old constraint (no-op if it doesn't exist).
    await client.query(
      `ALTER TABLE comm_coordinator.cases DROP CONSTRAINT IF EXISTS ck_cases_application`,
    );
    // Add the new constraint covering all three values.
    await client.query(
      `ALTER TABLE comm_coordinator.cases
       ADD CONSTRAINT ck_cases_application
       CHECK (application IN ('orphan_vin', 'consumer_dsar', 'operator_inquiry'))`,
    );
    console.log('Migration complete: ck_cases_application now allows operator_inquiry.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
