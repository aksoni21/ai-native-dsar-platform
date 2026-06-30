import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/tools';

export const runtime = 'nodejs';

/**
 * Trigger the inbound-parser sub-agent on a freshly-ingested live IMAP reply
 * that doesn't yet have an extracted_facts row.
 *
 *   POST /api/coordinator/messages/MSG-IN-FE98FA/parse
 *
 * Returns the same shape the parse_inbound_reply tool emits — classification,
 * extracted_facts, candidate_results, recommended_next_action, and (if the
 * cascade fired) cascade_outputs.
 *
 * Idempotent — if facts already exist, the underlying tool short-circuits to
 * the cached row.
 */
export async function POST(_req: NextRequest, ctx: { params: { messageId: string } }) {
  const { messageId } = ctx.params;
  try {
    const result = await executeTool('parse_inbound_reply', { message_id: messageId });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
