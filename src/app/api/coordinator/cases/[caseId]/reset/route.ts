import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import messagesSeed from '@/data/communication_messages.json';

export const runtime = 'nodejs';

interface SeedMessage {
  id: string;
  case_id: string;
  direction: string;
  subject: string;
  body: string;
}

/**
 * Reset a Coordinator case so the operator can re-run a live demo.
 *
 *   POST /api/coordinator/cases/CASE-VIN-001/reset
 *
 * Effects (within one transaction):
 *   1. Every outbound on the case → sent_at, approved_*, rfc822_message_id all NULLed.
 *   2. Every outbound's subject is re-stamped with a fresh 2-digit run-ID
 *      marker like " [#42]". The counter increments from whatever the
 *      current max is on this case's outbounds (so successive resets give
 *      01, 02, 03 …), wrapping at 99 → 01. Strips any prior stamp first.
 *      The IMAP triage uses this marker to ignore replies from previous
 *      demo runs whose In-Reply-To no longer matches anything in DB
 *      (their rfc822 IDs were NULLed in step 1).
 *   3. Every inbound on the case is deleted (extracted_facts cascade per FK
 *      or explicitly via this same query).
 *   4. Every outbound's subject + body is restored from communication_messages.json
 *      — wipes any Izzy-rewritten draft (clarification or cascade reply) from
 *      a prior run so the next demo starts from the canonical seed text.
 *   5. case.state → 'awaiting_reply' (the canonical "drafted, ready to send" state).
 *
 * The cron worker can re-ingest a fresh inbound; the /simulate-reply
 * endpoint can re-insert the canned ones.
 */
export async function POST(_req: NextRequest, ctx: { params: { caseId: string } }) {
  const { caseId } = ctx.params;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inboundIds = await client.query<{ id: string }>(
      `SELECT id FROM comm_coordinator.messages
       WHERE case_id = $1 AND direction = 'inbound'`,
      [caseId],
    );
    const ids = inboundIds.rows.map((r) => r.id);

    if (ids.length > 0) {
      await client.query(
        `DELETE FROM comm_coordinator.extracted_facts
         WHERE message_id = ANY($1::text[])`,
        [ids],
      );
      await client.query(
        `DELETE FROM comm_coordinator.messages
         WHERE id = ANY($1::text[])`,
        [ids],
      );
    }

    // Delete any stray outbounds on this case that aren't in the seed JSON.
    // These accumulate from e2e SMTP-loop test sends (MSG-MC-OUT-E2E-*) and
    // any historical Izzy-drafted outbound that isn't pinned to a seed id.
    // Without this step, updateNextPendingOutbound during a follow-up parse
    // can target one of these strays instead of the canonical seed outbound,
    // and the UI (which pins by seed id) shows stale "CANNED"/seed content.
    const seedOutbounds = (messagesSeed as SeedMessage[]).filter(
      (m) => m.case_id === caseId && m.direction === 'outbound',
    );
    const seedOutboundIds = seedOutbounds.map((m) => m.id);
    if (seedOutboundIds.length > 0) {
      await client.query(
        `DELETE FROM comm_coordinator.messages
         WHERE case_id = $1
           AND direction = 'outbound'
           AND id <> ALL($2::text[])`,
        [caseId, seedOutboundIds],
      );
    }

    await client.query(
      `UPDATE comm_coordinator.messages
       SET sent_at = NULL,
           approved_by = NULL,
           approved_at = NULL,
           rfc822_message_id = NULL
       WHERE case_id = $1 AND direction = 'outbound'`,
      [caseId],
    );

    // Restore every seed outbound's subject + body from the seed JSON. Without
    // this step, an Izzy-rewritten draft from a prior run (clarification or
    // cascade reply) sticks around and the operator sees stale content on the
    // next demo. The seed is the canonical "as-shipped" draft for each id.
    for (const seed of seedOutbounds) {
      await client.query(
        `UPDATE comm_coordinator.messages
            SET subject = $2, body = $3, agent_drafted = true
          WHERE id = $1`,
        [seed.id, seed.subject, seed.body],
      );
    }

    // Re-stamp every outbound's subject with a fresh monotonic run-ID.
    // Stored as comm_coordinator.cases.run_counter — atomic INCREMENT
    // guarantees a unique id every reset, never recycles. 4-digit zero-pad
    // [#0001]…[#9999] gives ~10k runs per case before width grows; we still
    // accept wider markers in findCaseId so growth is fine. Critical: the
    // counter is independent of the current outbounds in pg, so deleting
    // stray outbounds (or moving across cases) doesn't drop the next id.
    const bump = await client.query<{ run_counter: number }>(
      `UPDATE comm_coordinator.cases
          SET run_counter = run_counter + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING run_counter`,
      [caseId],
    );
    const nextId = bump.rows[0]?.run_counter ?? 1;
    const runId = String(nextId).padStart(4, '0');
    // Strip any prior " [#NN]" / " [#NNNN]" marker (2-6 digits) then re-append.
    await client.query(
      `UPDATE comm_coordinator.messages
       SET subject = regexp_replace(subject, ' \\[#[0-9]{2,6}\\]$', '') || $1
       WHERE case_id = $2 AND direction = 'outbound' AND subject IS NOT NULL`,
      [` [#${runId}]`, caseId],
    );

    await client.query(
      `UPDATE comm_coordinator.cases
       SET state = 'awaiting_reply', updated_at = NOW()
       WHERE id = $1`,
      [caseId],
    );

    await client.query('COMMIT');

    return NextResponse.json({
      case_id: caseId,
      inbounds_deleted: ids.length,
      run_id: runId,
      reset_at: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
