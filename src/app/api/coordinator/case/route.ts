import { NextRequest, NextResponse } from 'next/server';

import { loadCoordinatorCaseBundle } from '@/lib/coordinator-db';

export const runtime = 'nodejs';
// Live data — opt out of any route caching so updates from the cron worker
// are visible immediately on the next request.
export const dynamic = 'force-dynamic';

/**
 * Fetch one Coordinator case + its messages + extracted-facts in a single
 * query. Used by the client `useCoordinatorCase` hook and any read-side UI.
 *
 *   GET /api/coordinator/case?caseId=CASE-MC-001
 *   GET /api/coordinator/case?requestId=REQ-MC-REPLY
 *   GET /api/coordinator/case?vin=JT4567890ABCDEFGH
 *
 * Resolution order: caseId > requestId > vin.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get('caseId') || undefined;
  const requestId = searchParams.get('requestId') || undefined;
  const vin = searchParams.get('vin') || undefined;

  if (!caseId && !requestId && !vin) {
    return NextResponse.json(
      { error: 'one of caseId, requestId, vin is required' },
      { status: 400 },
    );
  }

  try {
    const bundle = await loadCoordinatorCaseBundle({ caseId, requestId, vin });
    if (!bundle) {
      return NextResponse.json({ error: 'not found', case: null }, { status: 404 });
    }
    return NextResponse.json(bundle);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
