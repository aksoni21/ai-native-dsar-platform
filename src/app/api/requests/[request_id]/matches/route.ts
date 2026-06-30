import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { buildLiveMatchesForRequest } from '@/lib/live-matches';

export const runtime = 'nodejs';

interface IntakeRow {
  request_id: string;
  request_types: string[];
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  state: string;
}

export async function GET(
  _req: Request,
  { params }: { params: { request_id: string } },
) {
  const requestId = params.request_id;
  if (!requestId) {
    return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
  }

  try {
    const { rows } = await getPool().query<IntakeRow>(
      `SELECT request_id, request_types,
              first_name, last_name, email::text AS email, phone, state
         FROM naica_demo.intake_requests
        WHERE request_id = $1
        LIMIT 1`,
      [requestId],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const r = rows[0];
    const result = await buildLiveMatchesForRequest({
      request_id: r.request_id,
      request_type: r.request_types?.[0] ?? 'right_to_know',
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone,
      state: r.state,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/requests/[request_id]/matches failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 },
    );
  }
}
