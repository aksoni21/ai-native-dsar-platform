'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowDown,
  Loader2,
  RefreshCw,
  CheckCircle2,
  RefreshCw as RefreshIcon,
  ListPlus,
  Mail,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileText,
  Search,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCoordinatorCase } from '@/components/coordinator/useCoordinatorCase';
import {
  OutboundCard,
  WaitingCard,
  ParsingCard,
  InboundCard,
  IzzyPersona,
  POLL_INTERVAL_MS,
} from '@/components/coordinator/TurnCards';
import { CascadeBundleReview } from '@/components/coordinator/CascadeBundleReview';
import type { RequestData, MatchData } from '@/types';

interface ConsumerReplyReviewViewProps {
  request: RequestData;
  matches: MatchData[];
}

export default function ConsumerReplyReviewView({
  request,
  matches,
}: ConsumerReplyReviewViewProps) {
  const cc = useCoordinatorCase({
    requestId: request.id,
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  // Outbounds pinned by canonical seed id (E2E-test residuals on the same
  // case get filtered out). Inbounds are chronological — first IMAP-ingested
  // or simulated reply is turn 1, second is turn 2.
  const out1 = cc.outbounds.find((m) => m.id === 'MSG-MC-OUT-001') ?? null;
  const out2 = cc.outbounds.find((m) => m.id === 'MSG-MC-OUT-002') ?? null;
  const in1 = cc.inbounds[0] ?? null;
  const in2 = cc.inbounds[1] ?? null;
  const facts1 = in1 ? cc.factsByMessage[in1.id] ?? null : null;
  const facts2 = in2 ? cc.factsByMessage[in2.id] ?? null : null;

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [simulatingTurn, setSimulatingTurn] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bundleApproved, setBundleApproved] = useState(false);
  const [bundleApprovedAt, setBundleApprovedAt] = useState<string | null>(null);

  const send = useCallback(
    async (messageId: string) => {
      setErrorMsg(null);
      setSendingId(messageId);
      try {
        const res = await fetch(`/api/coordinator/messages/${messageId}/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Send failed (${res.status})`);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setSendingId(null);
        cc.refetch();
      }
    },
    [cc],
  );

  const reset = useCallback(async () => {
    if (!cc.caseId) return;
    setErrorMsg(null);
    setResetting(true);
    setBundleApproved(false);
    setBundleApprovedAt(null);
    try {
      const res = await fetch(`/api/coordinator/cases/${cc.caseId}/reset`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Reset failed (${res.status})`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(false);
      cc.refetch();
    }
  }, [cc]);

  const simulate = useCallback(
    async (turn: number) => {
      if (!cc.caseId) return;
      setErrorMsg(null);
      setSimulatingTurn(turn);
      try {
        const res = await fetch(
          `/api/coordinator/cases/${cc.caseId}/simulate-reply?turn=${turn}`,
          { method: 'POST' },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Simulate failed (${res.status})`);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setSimulatingTurn(null);
        cc.refetch();
      }
    },
    [cc],
  );

  // Auto-trigger parse for inbound rows that don't yet have facts. Tracked
  // per-message-id so the same row isn't re-parsed in a tight poll loop.
  const parsingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const candidates: Array<{ id: string; needsParse: boolean }> = [
      { id: in1?.id ?? '', needsParse: !!in1 && !facts1 },
      { id: in2?.id ?? '', needsParse: !!in2 && !facts2 },
    ];
    for (const c of candidates) {
      if (!c.id || !c.needsParse) continue;
      if (parsingRef.current.has(c.id)) continue;
      parsingRef.current.add(c.id);
      fetch(`/api/coordinator/messages/${c.id}/parse`, { method: 'POST' })
        .catch(() => {})
        .finally(() => {
          parsingRef.current.delete(c.id);
          cc.refetch();
        });
    }
  }, [in1?.id, in2?.id, facts1?.id, facts2?.id, cc]);

  const out1Sent = !!out1?.sent_at;
  const out2Sent = !!out2?.sent_at;
  // The cascade fires on whichever inbound carries `provides_new_identity_info`.
  // Happy demo path is IN-1 ambiguous → IN-2 specific (cascade on facts2),
  // but if the consumer's first reply is already specific (Maria immediately
  // provides "Sanchez"), the cascade fires on facts1 and there's no IN-2.
  // Source the bundle review off whichever facts row actually has the outputs.
  const cascadeFacts =
    facts2?.cascade_outputs ? facts2 : facts1?.cascade_outputs ? facts1 : null;
  const cascadeInbound = cascadeFacts === facts2 ? in2 : cascadeFacts === facts1 ? in1 : null;
  const cascadeOutputs = cascadeFacts?.cascade_outputs ?? null;
  const cascadeRunning =
    (!!facts2 && !facts2.cascade_outputs && facts2.classification === 'provides_new_identity_info') ||
    (!facts2 && !!facts1 && !facts1.cascade_outputs && facts1.classification === 'provides_new_identity_info');
  const candidateCount = cascadeFacts?.candidate_results.length ?? 0;

  if (cc.loading && !cc.caseRecord) {
    return (
      <div className="space-y-4">
        <Header request={request} onReset={reset} resetting={resetting} />
        <p className="text-xs text-muted-foreground italic">Loading…</p>
      </div>
    );
  }

  if (!cc.caseId || !out1) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          No Coordinator case wired for {request.id}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header request={request} onReset={reset} resetting={resetting} />

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <IzzyPersona />

      {/* <RationaleFlow request={request} matches={matches} /> */}

      {/* Outbound #1 — DSAR confirmation */}
      <OutboundCard
        message={out1}
        onSend={() => send(out1.id)}
        sending={sendingId === out1.id}
        heading="Outreach #1 — DSAR confirmation receipt to consumer"
      />

      {/* Wait for inbound #1 */}
      {out1Sent && !in1 && (
        <WaitingCard
          recipientName={out1.recipient_name ?? out1.recipient}
          onSimulate={() => simulate(1)}
          simulating={simulatingTurn === 1}
        />
      )}

      {in1 && !facts1 && <ParsingCard />}
      {in1 && facts1 && <InboundCard message={in1} facts={facts1} />}

      {/* OUT-002 is not seeded on CASE-MC-001 — Izzy creates it live during
          parse. Cover the gap between facts1 landing and the upsert
          completing so the operator sees a status card instead of empty
          space. */}
      {in1 && facts1 && !out2 && (
        <ParsingCard message="Izzy is drafting the next outbound…" />
      )}

      {/* Outbound #2 — Izzy-drafted clarification or post-cascade reply */}
      {in1 && facts1 && out2 && (
        <OutboundCard
          message={out2}
          onSend={() => send(out2.id)}
          sending={sendingId === out2.id}
          heading="Outreach #2 — Coordinator-drafted clarification (auto-drafted from missing signals)"
        />
      )}

      {/* Wait for inbound #2 */}
      {out2Sent && !in2 && (
        <WaitingCard
          recipientName={out2?.recipient_name ?? out2?.recipient ?? 'consumer'}
          onSimulate={() => simulate(2)}
          simulating={simulatingTurn === 2}
        />
      )}

      {in2 && !facts2 && (
        <ParsingCard message="Coordinator parsing reply + running 4-agent cascade…" />
      )}
      {in2 && facts2 && <InboundCard message={in2} facts={facts2} />}

      {/* Cascade running between facts persisted and cascade_outputs persisted */}
      {cascadeRunning && (
        <ParsingCard message="Cascade in progress — identity-resolver, disposition-planner, report-generator, consumer-reply-drafter…" />
      )}

      {/* Cascade bundle — only when cascade_outputs landed (on either inbound) */}
      {cascadeFacts && cascadeOutputs && (
        <>
          <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
            <span>
              Specific reply parsed — Coordinator fanned out{' '}
              <span className="font-medium">
                {cascadeOutputs.sub_agents_used.length} sub-agents in parallel
              </span>{' '}
              and bundled their drafts below for one operator approval.
            </span>
          </div>
          <CascadeBundleReview
            outputs={cascadeOutputs}
            approved={bundleApproved}
            approvedAt={bundleApprovedAt}
            onApprove={() => {
              setBundleApproved(true);
              setBundleApprovedAt(new Date().toISOString());
            }}
          />
        </>
      )}

      {/* Resolution — only after bundle approved */}
      {bundleApproved && cascadeFacts && (
        <ResolutionCard
          request={request}
          matches={matches}
          facts={cascadeFacts}
          inboundId={cascadeInbound?.id ?? ''}
          replySubject={cascadeOutputs?.consumer_reply_draft?.subject ?? null}
          candidateCount={candidateCount}
        />
      )}
    </div>
  );
}

// ─── Header (with Reset button) ────────────────────────────────────────
function Header({
  request,
  onReset,
  resetting,
}: {
  request: RequestData;
  onReset: () => Promise<void>;
  resetting: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm">
        <span className="text-muted-foreground">DSAR · </span>
        <span className="font-mono text-[hsl(var(--info))]">{request.id}</span>
      </span>
      <Badge variant="outline" className="text-[10px]">
        {request.consumer_name}
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        {request.consumer_state}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={onReset}
        disabled={resetting}
        className="ml-auto gap-1.5"
      >
        {resetting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {resetting ? 'Resetting…' : 'Reset case'}
      </Button>
    </div>
  );
}

// ─── Scenario flow (step-by-step roadmap of the whole multi-turn case) ─
// function RationaleFlow({
//   request,
//   matches: _matches,
// }: {
//   request: RequestData;
//   matches: MatchData[];
// }) {
//   const [expanded, setExpanded] = useState(true);

//   // 4-phase grouping of the 15 logical steps. Each phase gets its own card
//   // with phase label + numbered steps inside. Operator scans top-to-bottom
//   // to see the full multi-turn flow at a glance.
//   const phases = [
//     {
//       key: 'setup',
//       label: 'Setup',
//       sublabel: 'system / automatic',
//       Icon: FileText,
//       cardClass: 'border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30',
//       iconClass: 'text-sky-600 dark:text-sky-400',
//       labelClass: 'text-sky-700 dark:text-sky-300',
//       steps: [
//         { n: 1, actor: 'system', text: 'DSAR filed via intake form' },
//         { n: 2, actor: 'system', text: 'Pipeline matches initial records on name + email' },
//         { n: 3, actor: 'system', text: `Compliance rules applied (${request.consumer_state} statutory window)` },
//       ],
//     },
//     {
//       key: 'turn1',
//       label: 'Turn 1 · Confirm receipt',
//       sublabel: 'gate #1',
//       Icon: Mail,
//       cardClass: 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30',
//       iconClass: 'text-amber-600 dark:text-amber-400',
//       labelClass: 'text-amber-700 dark:text-amber-300',
//       steps: [
//         { n: 4, actor: 'Izzy', text: 'Drafts DSAR confirmation receipt' },
//         { n: 5, actor: 'operator', text: 'Approves & sends outreach #1' },
//       ],
//     },
//     {
//       key: 'turn2',
//       label: 'Turn 2 · Clarify ambiguity',
//       sublabel: 'gate #2',
//       Icon: MessageSquare,
//       cardClass: 'border-violet-300 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30',
//       iconClass: 'text-violet-600 dark:text-violet-400',
//       labelClass: 'text-violet-700 dark:text-violet-300',
//       steps: [
//         { n: 6, actor: 'consumer', text: 'Replies ambiguously ("look into my old account…")' },
//         { n: 7, actor: 'Izzy', text: 'Parses → requests_clarification_needed; flags missing signals' },
//         { n: 8, actor: 'Izzy', text: 'Drafts clarification asking for previous name + year + event' },
//         { n: 9, actor: 'operator', text: 'Approves & sends outreach #2' },
//       ],
//     },
//     {
//       key: 'cascade',
//       label: 'Cascade · Stitch + decide',
//       sublabel: '4 sub-agents in parallel',
//       Icon: Search,
//       cardClass:
//         'border-fuchsia-300 dark:border-fuchsia-800 bg-fuchsia-50/60 dark:bg-fuchsia-950/30',
//       iconClass: 'text-fuchsia-600 dark:text-fuchsia-400',
//       labelClass: 'text-fuchsia-700 dark:text-fuchsia-300',
//       steps: [
//         { n: 10, actor: 'consumer', text: 'Replies with specifics (prior name, year, dealership)' },
//         { n: 11, actor: 'Izzy', text: 'Parses → provides_new_identity_info; 3 candidate records found' },
//         {
//           n: 12,
//           actor: 'Izzy · cascade',
//           text:
//             'Fans out 4 sub-agents in parallel — identity-resolver, disposition-planner, report-generator, consumer-reply-drafter',
//         },
//       ],
//     },
//     {
//       key: 'resolution',
//       label: 'Resolution',
//       sublabel: 'gate #3 → execution pipeline',
//       Icon: CheckCircle2,
//       cardClass:
//         'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30',
//       iconClass: 'text-emerald-600 dark:text-emerald-400',
//       labelClass: 'text-emerald-700 dark:text-emerald-300',
//       steps: [
//         {
//           n: 13,
//           actor: 'operator',
//           text: 'Reads each of the 4 cascade drafts (4-of-4 attestation)',
//         },
//         { n: 14, actor: 'operator', text: 'Approves the bundle' },
//         {
//           n: 15,
//           actor: 'pipeline',
//           text:
//             'Applies new disposition (3 → 6 records), sends consumer reply, resets SLA clock',
//         },
//       ],
//     },
//   ];

//   return (
//     <Card className="border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.04)]">
//       <CardContent className="space-y-3 py-3">
//         <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--info))]">
//           <Sparkles className="h-3.5 w-3.5" />
//           Scenario flow — 3 operator gates, 1 cascade fan-out
//         </div>
//         <button
//           type="button"
//           onClick={() => setExpanded((e) => !e)}
//           className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
//         >
//           {expanded ? (
//             <ChevronDown className="h-3.5 w-3.5" />
//           ) : (
//             <ChevronRight className="h-3.5 w-3.5" />
//           )}
//           {expanded ? 'Hide flow' : 'Show flow'}
//         </button>

//         {expanded && (
//           <div className="space-y-2">
//             {phases.map((p, i) => {
//               const Icon = p.Icon;
//               return (
//                 <div key={p.key} className="space-y-2">
//                   <div className={cn('rounded-md border p-3', p.cardClass)}>
//                     <div
//                       className={cn(
//                         'flex items-center gap-1.5 text-[11px] font-semibold mb-2',
//                         p.labelClass,
//                       )}
//                     >
//                       <Icon className={cn('h-3.5 w-3.5', p.iconClass)} />
//                       <span>{p.label}</span>
//                       <span className="ml-auto text-[10px] font-normal italic opacity-70">
//                         {p.sublabel}
//                       </span>
//                     </div>
//                     <ul className="space-y-1 text-[11px] leading-relaxed text-foreground">
//                       {p.steps.map((s) => (
//                         <li key={s.n} className="flex gap-2">
//                           <span className="font-mono tabular-nums text-muted-foreground/70 w-5 flex-shrink-0">
//                             {String(s.n).padStart(2, '0')}
//                           </span>
//                           <ActorBadge actor={s.actor} />
//                           <span className="flex-1">{s.text}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                   {i < phases.length - 1 && (
//                     <div className="flex justify-center">
//                       <ArrowDown className="h-3 w-3 text-[hsl(var(--info))]/60" />
//                     </div>
//                   )}
//                 </div>
//               );
//             })}

//             <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--info)/0.5)] bg-background p-3 mt-3">
//               <Lightbulb className="h-4 w-4 flex-shrink-0 text-[hsl(var(--info))] mt-0.5" />
//               <p className="text-xs leading-relaxed">
//                 <span className="font-semibold">Why this shape:</span>{' '}
//                 Izzy never writes to any system of record. Each agent draft is gated by a
//                 named operator approval, and the cascade lets one bundle approval authorize
//                 a fan-out of 4 independent sub-agent outputs — identity stitching, regulator
//                 paperwork, deletion plan, and consumer reply — all in one decision.
//               </p>
//             </div>
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

// Small actor pill used inside the step list.
function ActorBadge({ actor }: { actor: string }) {
  const styles: Record<string, string> = {
    system: 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    Izzy: 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300',
    'Izzy · cascade':
      'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-700 dark:border-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
    operator:
      'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    consumer:
      'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300',
    pipeline:
      'border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300',
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex-shrink-0 text-[9px] font-mono px-1.5 py-0 h-4',
        styles[actor] ?? styles.system,
      )}
    >
      {actor}
    </Badge>
  );
}

// ─── Resolution card (post-bundle approval manifest) ───────────────────
function ResolutionCard({
  request,
  matches,
  facts,
  inboundId,
  replySubject,
  candidateCount,
}: {
  request: RequestData;
  matches: MatchData[];
  facts: NonNullable<ReturnType<typeof useCoordinatorCase>['facts']>;
  inboundId: string;
  replySubject: string | null;
  candidateCount: number;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            Bundle executed · {candidateCount} new records appended to {request.id}
          </span>
          <Badge
            variant="outline"
            className="ml-auto text-[10px] border-emerald-400 text-emerald-700 dark:text-emerald-300"
          >
            <RefreshIcon className="mr-1 h-3 w-3" /> system:execution_pipeline
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {expanded ? 'Hide manifest' : 'Show manifest'}
        </button>
        {expanded && (
          <>
            <ul className="space-y-1.5">
              {facts.candidate_results.map((c) => (
                <li
                  key={c.source_id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-300/60 dark:border-emerald-800/60 bg-background px-3 py-2 text-xs"
                >
                  <ListPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">{c.candidate_label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span>added to DSAR scope</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {c.source_id}
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-emerald-300/60 dark:border-emerald-800/60 bg-background p-3 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Match scope:</span>{' '}
                <span className="font-mono">
                  {matches.length} → {matches.length + candidateCount} records
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Consumer reply queued:</span>{' '}
                <span className="font-mono inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {replySubject ?? '(no draft)'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">SLA clock:</span>{' '}
                <span className="font-mono">reset on inbound (statutory deadline preserved)</span>
              </div>
              <div>
                <span className="text-muted-foreground">Source citation:</span>{' '}
                <span className="font-mono">
                  consumer attestation in {inboundId} (literal text in audit)
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Demo: matches.json wasn&apos;t mutated — the manifest above is what the post-approval
              execution pipeline would commit. Four cascade drafts were generated by sub-agents;
              the operator&apos;s single bundle approval is the only thing that authorized them
              to cross the read-only boundary.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
