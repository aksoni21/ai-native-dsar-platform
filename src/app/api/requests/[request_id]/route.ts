import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

interface IntakeRow {
  request_id: string;
  request_types: string[];
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  state: string;
  status: string;
  duplicate_of_id: string | null;
  deadline_at: string | null;
  created_at: string;
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
      `SELECT request_id, request_types, first_name, last_name,
              email::text AS email, phone, state, status, duplicate_of_id,
              deadline_at, created_at
         FROM naica_demo.intake_requests
        WHERE request_id = $1
        LIMIT 1`,
      [requestId],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Normalize intake-form short-form ids to the long-form names the UI
    // and compliance_rules.json use (delete → deletion, correct → correction,
    // know → right_to_know). Mirrors the alias map in src/lib/data.ts.
    const TYPE_ALIASES: Record<string, string> = {
      delete: 'deletion',
      correct: 'correction',
      know: 'right_to_know',
    };
    const r = rows[0];
    const rawType = r.request_types?.[0] ?? 'right_to_know';
    const normalizedType = TYPE_ALIASES[rawType] ?? rawType;

    return NextResponse.json({
      id: r.request_id,
      consumer_name: `${r.first_name} ${r.last_name}`.trim(),
      consumer_email: r.email,
      consumer_phone: r.phone,
      consumer_state: r.state,
      request_type: normalizedType,
      status: r.status,
      duplicate_of_id: r.duplicate_of_id,
      deadline_at: r.deadline_at ?? r.created_at,
      report_text: null,
      created_at: r.created_at,
      demo_scenario: 'Live request submitted via /intake',
    });
  } catch (err) {
    console.error('GET /api/requests/[request_id] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 },
    );
  }
}
