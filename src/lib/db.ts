// Direct Postgres connection — used by API routes only. Server-side only.
//
// Mirrors the ai-sdr pattern (db_client.py): a single connection pool reading
// the privileged DATABASE_URL_FOR_ALEMBIC, parameterized SQL, no SDK in
// between. Postgres CHECK constraints + RLS in the schema enforce data
// integrity; the route layer just validates shape.

import { Pool } from 'pg';

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (globalForPg.__pgPool) return globalForPg.__pgPool;

  const url = process.env.DATABASE_URL_FOR_ALEMBIC;
  if (!url) {
    throw new Error(
      'DATABASE_URL_FOR_ALEMBIC is not set. Add it to .env.local and restart the dev server.',
    );
  }

  const pool = new Pool({
    connectionString: url,
    // Supabase requires SSL. Don't verify the chain in dev — the cert
    // varies between the direct host and the pooler hosts.
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
  });

  globalForPg.__pgPool = pool;
  return pool;
}
