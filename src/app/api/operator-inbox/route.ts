import { NextResponse } from 'next/server';

import { loadOperatorInquiryThreads } from '@/lib/coordinator-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator Inbox feed — list of ad-hoc emails sent to Izzy by authorized
 * operators, plus her replies. Used by the InboxDrawer in the demo header
 * to render the async-email loop alongside the existing chat + Coordinator
 * panes.
 *
 *   GET /api/operator-inbox
 *
 * Returns:
 *   { threads: [{ case, inbound, outbound }, ...] }
 */
export async function GET() {
  try {
    const threads = await loadOperatorInquiryThreads(50);
    return NextResponse.json({ threads });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, threads: [] }, { status: 500 });
  }
}
