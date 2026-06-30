import { NextRequest, NextResponse } from 'next/server';

import { ingestReplies } from '@/lib/email/imap';

export const runtime = 'nodejs';
// IMAP polling can take a few seconds; keep the route alive for up to 60s.
export const maxDuration = 60;

// Communication Coordinator inbound-reply ingestion.
//
// Called by Railway Cron on a recurring schedule (every minute by default).
// Connects to the privacy-ops Gmail mailbox over IMAP, scans UNSEEN messages,
// matches each to a comm_coordinator.cases row by header or subject, and
// inserts an inbound row into comm_coordinator.messages.
//
// Bearer-auth with CRON_SECRET. Railway setup:
//   Service > Settings > Cron Schedule
//     Schedule: every minute (cron syntax: an asterisk-slash-1 in the minute slot, then four asterisks)
//     Command:  curl -fsSL -X POST \
//                 -H "Authorization: Bearer $CRON_SECRET" \
//                 "$RAILWAY_PUBLIC_URL/api/cron/ingest-replies"
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on the server' },
      { status: 500 },
    );
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await ingestReplies();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
