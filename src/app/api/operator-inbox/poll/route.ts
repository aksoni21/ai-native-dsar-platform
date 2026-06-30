import { NextResponse } from 'next/server';

import { ingestReplies } from '@/lib/email/imap';

export const runtime = 'nodejs';
// IMAP polling + Izzy handler can take 30-60s. Keep the route alive.
export const maxDuration = 90;

/**
 * Same-origin manual-poll trigger for the Operator Inbox drawer.
 *
 * Wraps `ingestReplies` (the same function the auth-protected
 * `/api/cron/ingest-replies` route uses) without requiring the
 * CRON_SECRET — the drawer button can hit it directly. Returns the
 * ingest result so the UI can surface "N new emails ingested".
 *
 * NO bearer auth — this is the demo's "manual cron" affordance. In
 * production you'd lock it down (allowed-origin check, session-cookie
 * gate, etc.). For the demo it's intentionally open.
 */
export async function POST() {
  try {
    const result = await ingestReplies();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
