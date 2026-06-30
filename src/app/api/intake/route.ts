import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { seedSourceSystemsForRequest } from '@/lib/demo-seed';

export const runtime = 'nodejs';

interface IntakePayload {
  requestTypes: string[];
  requester: 'self' | 'minor' | 'agent';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  relationship: string;
  agentName: string;
  agentEmail: string;
  agentOrg: string;
  authorizationConfirmed: boolean;
  alternateContacts: string;
  accountId: string;
  details: string;
  delivery: 'email' | 'mail' | 'phone';
  mailingAddress: string;
  attestUnderstands: boolean;
}

const REQUESTERS = ['self', 'minor', 'agent'];
const DELIVERIES = ['email', 'mail', 'phone'];

export async function POST(req: Request) {
  let body: IntakePayload;
  try {
    body = (await req.json()) as IntakePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  // Shape validation — DB CHECK constraints catch what slips through, but a
  // friendly 400 is nicer than a 500.
  if (!Array.isArray(body.requestTypes) || body.requestTypes.length === 0) {
    return NextResponse.json({ error: 'At least one request type is required.' }, { status: 400 });
  }
  if (!REQUESTERS.includes(body.requester)) {
    return NextResponse.json({ error: 'Invalid requester.' }, { status: 400 });
  }
  if (!DELIVERIES.includes(body.delivery)) {
    return NextResponse.json({ error: 'Invalid delivery method.' }, { status: 400 });
  }
  if (
    !body.firstName?.trim() ||
    !body.lastName?.trim() ||
    !body.email?.trim() ||
    !body.state
  ) {
    return NextResponse.json({ error: 'Missing required identity fields.' }, { status: 400 });
  }
  if (!body.attestUnderstands) {
    return NextResponse.json({ error: 'You must confirm the attestation.' }, { status: 400 });
  }

  const isAgent = body.requester === 'agent';
  const isMail = body.delivery === 'mail';
  const deadlineAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

  const userAgent = req.headers.get('user-agent');
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null;

  const sql = `
    INSERT INTO naica_demo.intake_requests (
      request_types, requester,
      first_name, last_name, email, phone, state, relationship,
      agent_name, agent_email, agent_org, authorization_confirmed,
      alternate_contacts, account_id, details,
      delivery, mailing_address,
      attest_truthful, attest_understands,
      deadline_at, ip_address, user_agent, raw_payload
    ) VALUES (
      $1, $2,
      $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15,
      $16, $17,
      $18, $19,
      $20, $21::inet, $22, $23::jsonb
    )
    RETURNING request_id
  `;

  const params = [
    body.requestTypes,
    body.requester,
    body.firstName.trim(),
    body.lastName.trim(),
    body.email.trim(),
    body.phone?.trim() || null,
    body.state,
    body.relationship || null,
    isAgent ? body.agentName?.trim() || null : null,
    isAgent ? body.agentEmail?.trim() || null : null,
    isAgent ? body.agentOrg?.trim() || null : null,
    isAgent ? body.authorizationConfirmed : null,
    body.alternateContacts?.trim() || null,
    body.accountId?.trim() || null,
    body.details?.trim() || null,
    body.delivery,
    isMail ? body.mailingAddress?.trim() || null : null,
    // attest_truthful column is NOT NULL but the form no longer collects it — hardcode true so the insert satisfies the schema.
    true,
    body.attestUnderstands,
    deadlineAt.toISOString(),
    ipAddress,
    userAgent,
    JSON.stringify(body),
  ];

  try {
    const result = await getPool().query<{ request_id: string }>(sql, params);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Insert returned no rows.' }, { status: 500 });
    }
    const requestId = result.rows[0].request_id;

    // Auto-seed source systems so the pipeline has something to match on.
    // Failures here don't fail the intake — the consumer's request is already
    // logged; the demo just won't have backing data for this submission.
    let seedShape: string | null = null;
    try {
      const seedResult = await seedSourceSystemsForRequest({
        requestTypes: body.requestTypes,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone?.trim() || null,
        state: body.state,
      });
      seedShape = seedResult.shape;
    } catch (seedErr) {
      console.error('demo-seed failed for', requestId, seedErr);
    }

    return NextResponse.json({
      request_id: requestId,
      deadline_at: deadlineAt.toISOString(),
      seed_shape: seedShape,
    });
  } catch (err) {
    console.error('intake insert failed:', err);
    const message =
      err instanceof Error ? err.message : 'Database error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
