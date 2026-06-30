import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

interface WaitlistPayload {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  use_case?: string;
  source?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SOURCES = new Set([
  'early_access_waitlist',
  'shadow_ai_discovery_waitlist',
]);

export async function POST(req: Request) {
  let body: WaitlistPayload;
  try {
    body = (await req.json()) as WaitlistPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const source = body.source && ALLOWED_SOURCES.has(body.source) ? body.source : 'early_access_waitlist';

  const userAgent = req.headers.get('user-agent');
  const referrer = req.headers.get('referer');

  const sql = `
    INSERT INTO ai_sdr.landing_page_leads (
      email, name, company, role, use_case, source, user_agent, referrer
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
    RETURNING id
  `;

  const params = [
    email,
    body.name?.trim() || null,
    body.company?.trim() || null,
    body.role?.trim() || null,
    body.use_case?.trim() || null,
    source,
    userAgent,
    referrer,
  ];

  try {
    const result = await getPool().query<{ id: string }>(sql, params);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Insert returned no rows.' }, { status: 500 });
    }
    return NextResponse.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('waitlist insert failed:', err);
    const message = err instanceof Error ? err.message : 'Database error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
