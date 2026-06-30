import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import {
  findPartyByEmail,
  findPartyByName,
  decodeInferredAttributes,
} from '@/lib/db-queries';
import { runIdentityResolver } from '@/lib/sub-agents/identity-resolver';
import { runDispositionPlanner } from '@/lib/sub-agents/disposition-planner';
import { runReportGenerator } from '@/lib/sub-agents/report-generator';
import { getComplianceRules } from '@/lib/data';

interface IntakeRequestRow {
  request_id: string;
  request_types: string[];
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  state: string;
  status: string;
  deadline_at: string | null;
  created_at: string;
  duplicate_of_id: string | null;
}

// Step indices match PIPELINE_STEPS in src/lib/constants.ts so the existing
// UI gating (showSection(N)) keeps working unchanged. Order:
// 0 intake → 1 dedup → 2 search → 3 vin_expand → 4 score → 5 vin_search →
// 6 agent_resolve → 7 decode → 8 rules → 9 disposition → 10 report → 11 review.
// vin_expand + vin_search are no-ops for live intake requests (we don't yet
// have ownership data wired into the live pipeline) — they're emitted as
// completed steps with a 'no_ownership_data' result so the rail dot lights up.
const STEP = {
  intake: 0,
  dedup: 1,
  search: 2,
  vin_expand: 3,
  score: 4,
  vin_search: 5,
  agent_resolve: 6,
  decode: 7,
  rules: 8,
  disposition: 9,
  report: 10,
  review: 11,
} as const;

export async function POST(request: NextRequest) {
  const { request_id } = await request.json();
  if (!request_id || typeof request_id !== 'string') {
    return new Response(JSON.stringify({ error: 'request_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const start = (step: number, id: string) => send({ type: 'step_started', step, id });
      const done = (step: number, id: string, result: unknown) =>
        send({ type: 'step_completed', step, id, result });

      try {
        // ── Step 0: intake — load the row from Supabase ────────────────
        start(STEP.intake, 'intake');
        const { rows } = await getPool().query<IntakeRequestRow>(
          `SELECT request_id, request_types, first_name, last_name,
                  email::text AS email, phone, state, status, deadline_at,
                  created_at, duplicate_of_id
             FROM naica_demo.intake_requests
            WHERE request_id = $1
            LIMIT 1`,
          [request_id],
        );
        if (rows.length === 0) {
          send({ type: 'error', message: `Request ${request_id} not found in intake_requests` });
          controller.close();
          return;
        }
        const req = rows[0];
        const requestType = req.request_types[0] ?? 'right_to_know';
        done(STEP.intake, 'intake', {
          request_id: req.request_id,
          consumer_name: `${req.first_name} ${req.last_name}`,
          state: req.state,
          request_type: requestType,
          status: req.status,
          deadline_at: req.deadline_at,
        });

        // ── Step 1: dedup — same email/phone, different request_id ─────
        start(STEP.dedup, 'dedup');
        const dupResult = await getPool().query<{ request_id: string; created_at: string }>(
          `SELECT request_id, created_at
             FROM naica_demo.intake_requests
            WHERE request_id <> $1
              AND (email = $2::citext
                   OR (phone IS NOT NULL AND phone = $3))
            ORDER BY created_at DESC
            LIMIT 5`,
          [req.request_id, req.email, req.phone],
        );
        done(STEP.dedup, 'dedup', {
          duplicate_of_id: req.duplicate_of_id,
          potential_duplicates: dupResult.rows,
        });

        // ── Step 2: search — probe across source systems ───────────────
        start(STEP.search, 'search');
        const [byEmail, byName] = await Promise.all([
          findPartyByEmail(req.email),
          findPartyByName(req.first_name, req.last_name, req.state),
        ]);
        const partyIds = Array.from(
          new Set([
            ...byEmail.distinct_dwh_party_ids,
            ...byName.distinct_dwh_party_ids,
          ]),
        );
        done(STEP.search, 'search', {
          email_matches: byEmail.match_count,
          name_matches: byName.match_count,
          distinct_party_ids: partyIds,
          matches: [...byEmail.matches, ...byName.matches],
        });

        // ── Step 3: vin_expand — no-op for live intake (no ownership
        // data wired in yet). Emit a completed event so the dot aligns.
        start(STEP.vin_expand, 'vin_expand');
        done(STEP.vin_expand, 'vin_expand', { skipped: true, reason: 'no_ownership_data_for_live_request' });

        // ── Step 4: score — agentic identity resolution ────────────────
        start(STEP.score, 'score');
        const hint = `Name: ${req.first_name} ${req.last_name}\nEmail: ${req.email}\nPhone: ${req.phone ?? '(none)'}\nState: ${req.state}`;
        const identityResult = await runIdentityResolver(hint);
        const identitySummary = identityResult.summary;
        done(STEP.score, 'score', { summary: identitySummary, party_ids: partyIds });

        // ── Step 5: vin_search — no-op for live intake. Emit completed
        // event so the rail dot lights up.
        start(STEP.vin_search, 'vin_search');
        done(STEP.vin_search, 'vin_search', { skipped: true, reason: 'no_ownership_data_for_live_request' });

        // ── Step 4: agent_resolve — surface ambiguities (reuses step 3) ─
        start(STEP.agent_resolve, 'agent_resolve');
        const ambiguous =
          partyIds.length > 1 ||
          /maiden|previous|ambiguous|unclear|conflict/i.test(identitySummary);
        done(STEP.agent_resolve, 'agent_resolve', {
          ambiguous,
          party_count: partyIds.length,
          note: ambiguous
            ? 'Identity resolution flagged ambiguity — see step 3 narrative for details.'
            : 'No ambiguity — single matched identity.',
        });

        // ── Step 5: decode — coded fields per party ────────────────────
        start(STEP.decode, 'decode');
        const decoded = await Promise.all(
          partyIds.map((pid) => decodeInferredAttributes(pid).catch((e) => ({ error: String(e), party_id: pid }))),
        );
        done(STEP.decode, 'decode', { decoded });

        // ── Step 6: rules — compliance lookup ──────────────────────────
        start(STEP.rules, 'rules');
        const rule = getComplianceRules(req.state, requestType);
        done(STEP.rules, 'rules', {
          state: req.state,
          request_type: requestType,
          rule: rule
            ? {
                deadline_days: rule.deadline_days,
                required_disclosures: rule.required_disclosures,
                exceptions: rule.exceptions,
              }
            : null,
        });

        // ── Step 7: disposition — agentic plan ─────────────────────────
        start(STEP.disposition, 'disposition');
        const disposition = (await runDispositionPlanner(req.request_id)).summary;
        done(STEP.disposition, 'disposition', { narrative: disposition });

        // ── Step 8: report — agentic regulator-ready document ──────────
        start(STEP.report, 'report');
        const report = (await runReportGenerator(req.request_id)).summary;
        done(STEP.report, 'report', { report_text: report });

        // ── Step 9: review — terminal, awaiting human ──────────────────
        start(STEP.review, 'review');
        done(STEP.review, 'review', {
          status: 'awaiting_human_approval',
          note: 'Pipeline complete. No write actions execute until a human approves in the UI.',
        });

        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
