import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

interface ListRow {
  request_id: string;
  first_name: string;
  last_name: string;
  email: string;
  state: string;
  request_types: string[];
  status: string;
  created_at: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '25', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 25;

  try {
    const pool = getPool();
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query<ListRow>(
        `SELECT request_id, first_name, last_name,
                email::text AS email, state, request_types,
                status, created_at
           FROM naica_demo.intake_requests
           ORDER BY created_at DESC
           LIMIT $1`,
        [limit],
      ),
      pool.query<{ count: string }>(`SELECT count(*) FROM naica_demo.intake_requests`),
    ]);
    return NextResponse.json({ requests: rows, total: parseInt(countRows[0].count, 10) });
  } catch (err) {
    console.error('GET /api/requests/list failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 },
    );
  }
}
