'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Eye,
  Lock,
  Check,
  CheckCircle2,
  Wrench,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  History,
  SearchX,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCoordinatorCase } from '@/components/coordinator/useCoordinatorCase';
import {
  OutboundCard,
  WaitingCard,
  ParsingCard,
  InboundCard,
  IzzyPersona,
  formatStableDateTime,
  POLL_INTERVAL_MS,
} from '@/components/coordinator/TurnCards';
import { getOrphanVinByVin } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { RequestData, CommunicationExtractedFacts } from '@/types';

interface OrphanInvestigationViewProps {
  request: RequestData;
  vin: string;
  onBack?: () => void;
}

// ─── Final approval gate (read reply + approve attribution) ────────────
function FinalApprovalGate({
  hasReadReplyText,
  attributionApproved,
  approvedAt,
  onMarkRead,
  onApprove,
}: {
  hasReadReplyText: boolean;
  attributionApproved: boolean;
  approvedAt: string | null;
  onMarkRead: () => void;
  onApprove: () => void;
}) {
  if (attributionApproved) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium">Attribution approved by operator@instrata.com</span>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {formatStableDateTime(approvedAt)}
        </span>
      </div>
    );
  }
  return (
    <Card className="border-[hsl(var(--warning)/0.5)] bg-[hsl(var(--warning)/0.04)]">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
          <span className="font-semibold">Final operator gate · Apply attribution</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Before approving the attribution write, confirm you&apos;ve read the literal reply
          text above. The execution pipeline only fires after this gate clears.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={hasReadReplyText ? 'outline' : 'default'}
            disabled={hasReadReplyText}
            onClick={onMarkRead}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            {hasReadReplyText ? 'Reply text read' : "I've read the reply"}
          </Button>
          <Button
            size="sm"
            disabled={!hasReadReplyText}
            onClick={onApprove}
            className="gap-1.5"
          >
            {hasReadReplyText ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            Approve attribution
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Resolution card (post-approval pipeline manifest) ─────────────────
function ResolutionCard({
  vin,
  facts,
}: {
  vin: string;
  facts: CommunicationExtractedFacts;
}) {
  const ef = facts.extracted_facts as Record<string, string>;
  const candidate = facts.candidate_results[0];
  const consumerName = candidate?.candidate_label?.split(' — ')[0] ?? ef.candidate_name ?? 'Unknown';
  const purchaseDate = ef.original_purchase_date ?? '—';
  const sourceSystem = ef.source_system ?? 'Dealer Network archive';
  const [expanded, setExpanded] = useState(true);
  return (
    <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            Orphan resolved · attribution applied
          </span>
          <Badge
            variant="outline"
            className="ml-auto text-[10px] border-emerald-400 text-emerald-700 dark:text-emerald-300"
          >
            <Wrench className="mr-1 h-3 w-3" /> system:execution_pipeline
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
            <div className="rounded-md border border-emerald-300/60 dark:border-emerald-800/60 bg-background p-3 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">vehicle_ownerships row written:</span>{' '}
                <span className="font-mono">
                  consumer=&quot;{consumerName}&quot;, vin=&quot;{vin}&quot;,
                  start=&quot;{purchaseDate}&quot;, end=null, source=&quot;{sourceSystem}&quot;
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">orphan_vins.status:</span>{' '}
                <span className="font-mono">investigating → resolved</span>
              </div>
              <div>
                <span className="text-muted-foreground">audit_log entry:</span>{' '}
                <span className="font-mono">
                  attribution_applied · actor=human:operator@instrata.com
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Demo: writes are no-ops; the manifest above is what the post-approval execution pipeline
              would commit. The agent never wrote anything — every change traces back to two named
              operator approvals (Send #1, Send #2) and one final attribution gate.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Header bits ───────────────────────────────────────────────────────
function Header({
  vin,
  orphan,
  onBack,
  showStatus,
  onReset,
  resetting,
}: {
  vin: string;
  orphan: ReturnType<typeof getOrphanVinByVin>;
  onBack?: () => void;
  showStatus?: boolean;
  onReset?: () => Promise<void>;
  resetting?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {onBack && (
        <Button size="sm" variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Orphan list
        </Button>
      )}
      <span className="text-sm">
        <span className="text-muted-foreground">Investigating · </span>
        <span className="font-mono text-[hsl(var(--info))]">{vin}</span>
      </span>
      {orphan && (
        <>
          <Badge variant="outline" className="text-[10px] font-mono">
            {orphan.record_count.toLocaleString()} records
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {orphan.category.replace(/_/g, ' ')}
          </Badge>
          {showStatus && (
            <Badge variant="outline" className="text-[10px]">
              {orphan.status.replace(/_/g, ' ')}
            </Badge>
          )}
        </>
      )}
      {onReset && (
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
      )}
    </div>
  );
}

// ─── Rationale flow boxes (why we picked the Legacy CRM team) ──────────
function RationaleFlow({
  signals,
  likelyCause,
}: {
  signals: string[];
  likelyCause: string;
}) {
  // Bucket each deterministic signal into one of three thematic groups.
  // Predicates are deliberately loose — anything that doesn't match falls
  // into "Other" so a future signal addition still renders cleanly.
  const buckets = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      Icon: React.ComponentType<{ className?: string }>;
      cardClass: string;
      iconClass: string;
      labelClass: string;
      match: (s: string) => boolean;
    }> = [
      {
        key: 'historical',
        label: 'Was active before migration',
        Icon: History,
        cardClass: 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30',
        iconClass: 'text-amber-600 dark:text-amber-400',
        labelClass: 'text-amber-700 dark:text-amber-300',
        match: (s) => /legacy crm|2019/i.test(s),
      },
      {
        key: 'missing',
        label: 'Vanished from modern systems',
        Icon: SearchX,
        cardClass: 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30',
        iconClass: 'text-rose-600 dark:text-rose-400',
        labelClass: 'text-rose-700 dark:text-rose-300',
        match: (s) => /absent|missing/i.test(s),
      },
      {
        key: 'downstream',
        label: 'Still active downstream',
        Icon: Activity,
        cardClass:
          'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        labelClass: 'text-emerald-700 dark:text-emerald-300',
        match: (s) => /telematics|independent shop|dallas/i.test(s),
      },
    ];

    const remaining = [...signals];
    const filled = groups.map((g) => {
      const own = remaining.filter(g.match);
      for (const o of own) {
        const idx = remaining.indexOf(o);
        if (idx >= 0) remaining.splice(idx, 1);
      }
      return { ...g, signals: own };
    });

    if (remaining.length > 0) {
      filled.push({
        key: 'other',
        label: 'Other evidence',
        Icon: Sparkles,
        cardClass: 'border-border bg-muted/20',
        iconClass: 'text-muted-foreground',
        labelClass: 'text-muted-foreground',
        match: () => true,
        signals: remaining,
      });
    }

    return filled.filter((f) => f.signals.length > 0);
  }, [signals]);

  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.04)]">
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--info))]">
          <Sparkles className="h-3.5 w-3.5" />
          Why the Coordinator picked the Legacy CRM team
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {expanded ? 'Hide rationale' : 'Show rationale'}
        </button>

        {expanded && (
          <div
            className={cn(
              'grid gap-2',
              buckets.length === 1 && 'grid-cols-1',
              buckets.length === 2 && 'grid-cols-1 md:grid-cols-2',
              buckets.length >= 3 && 'grid-cols-1 md:grid-cols-3',
            )}
          >
            {buckets.map((b) => {
              const Icon = b.Icon;
              return (
                <div
                  key={b.key}
                  className={cn('rounded-md border p-3', b.cardClass)}
                >
                  <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold mb-1.5', b.labelClass)}>
                    <Icon className={cn('h-3.5 w-3.5', b.iconClass)} />
                    {b.label}
                  </div>
                  <ul className="space-y-1 text-[11px] leading-relaxed text-foreground">
                    {b.signals.map((s) => (
                      <li key={s} className="flex gap-1.5">
                        <span className="text-muted-foreground/60">·</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

         {/* <div className="flex justify-center">
          <ArrowDown className="h-4 w-4 text-[hsl(var(--info))]" />
        </div>

       <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--info)/0.5)] bg-background p-3">
          <Lightbulb className="h-4 w-4 flex-shrink-0 text-[hsl(var(--info))] mt-0.5" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Conclusion:</span>{' '}
            {likelyCause}
          </p>
        </div> */}
      </CardContent>
    </Card>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────
export default function OrphanInvestigationView({
  request: _request,
  vin,
  onBack,
}: OrphanInvestigationViewProps) {
  const orphan = getOrphanVinByVin(vin);
  const cc = useCoordinatorCase({ vin, pollIntervalMs: POLL_INTERVAL_MS });

  // Outbounds are pinned by canonical seed id (MSG-VIN-OUT-001/002 are the
  // staged drafts). Inbounds are chronological — the first reply on the case
  // is turn 1 (whether ingested live via IMAP as MSG-IN-XXXXXX or simulated
  // as MSG-VIN-IN-001), the second is turn 2.
  const out1 = cc.outbounds.find((m) => m.id === 'MSG-VIN-OUT-001') ?? null;
  const out2 = cc.outbounds.find((m) => m.id === 'MSG-VIN-OUT-002') ?? null;
  const in1 = cc.inbounds[0] ?? null;
  const in2 = cc.inbounds[1] ?? null;
  const facts1 = in1 ? cc.factsByMessage[in1.id] ?? null : null;
  const facts2 = in2 ? cc.factsByMessage[in2.id] ?? null : null;

  const in2State = in2 ? cc.inboundStateFor(in2.id) : null;

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [simulatingTurn, setSimulatingTurn] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const send = useCallback(
    async (messageId: string) => {
      setErrorMsg(null);
      setSendingId(messageId);
      try {
        const res = await fetch(
          `/api/coordinator/messages/${messageId}/send`,
          { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
        );
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

  // Auto-trigger parse on inbound rows that don't yet have facts. Tracked
  // per-message-id so the same row isn't re-parsed in a tight poll loop while
  // the request is in flight.
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

  // ─── Loading state ───
  if (cc.loading && !cc.caseRecord) {
    return (
      <div className="space-y-4">
        <Header vin={vin} orphan={orphan} onBack={onBack} />
        <p className="text-xs text-muted-foreground italic">Loading…</p>
      </div>
    );
  }

  // ─── No case staged for this VIN ───
  if (!cc.caseId || !out1) {
    if (!orphan) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Sparkles className="h-6 w-6 text-muted-foreground/60" />
          <p className="max-w-sm text-sm text-muted-foreground">
            No orphan record for VIN {vin}.
          </p>
          {onBack && (
            <Button size="sm" variant="outline" onClick={onBack} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to orphan list
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <Header vin={vin} orphan={orphan} onBack={onBack} showStatus />
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="space-y-3 py-4">
            <div className="text-sm font-semibold">
              Queued for investigation — no outreach drafted yet
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Coordinator has not yet drafted outreach for this VIN. For the demo, the
              two-turn live flow is staged on{' '}
              <span className="font-mono">JT4567890ABCDEFGH</span> only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Active case — live round-trip flow ───
  const out1Sent = !!out1.sent_at;
  const out2Drafted = !!out2;
  const out2Sent = !!out2?.sent_at;
  const finalApproved = !!in2State?.attributionApproved;

  return (
    <div className="space-y-4">
      <Header
        vin={vin}
        orphan={orphan}
        onBack={onBack}
        onReset={reset}
        resetting={resetting}
      />

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <IzzyPersona />

      {/* Why the Coordinator picked the Legacy CRM team */}
      {orphan && <RationaleFlow signals={orphan.category_signals} likelyCause={orphan.likely_cause} />}

      {/* Outbound #1 */}
      <OutboundCard
        message={out1}
        onSend={() => send(out1.id)}
        sending={sendingId === out1.id}
        heading="Outreach #1 — Legacy CRM Archive team"
      />

      {/* If sent but no inbound yet, show waiting card */}
      {out1Sent && !in1 && (
        <WaitingCard
          recipientName={out1.recipient_name ?? out1.recipient}
          onSimulate={() => simulate(1)}
          simulating={simulatingTurn === 1}
        />
      )}

      {/* Inbound #1 */}
      {in1 && !facts1 && <ParsingCard />}
      {in1 && facts1 && <InboundCard message={in1} facts={facts1} />}

      {/* Outbound #2 — only after inbound #1 parsed */}
      {in1 && facts1 && out2Drafted && out2 && (
        <OutboundCard
          message={out2}
          onSend={() => send(out2.id)}
          sending={sendingId === out2.id}
          heading="Outreach #2 — Eric Park, Dealer Network Archives (auto-drafted from redirect)"
        />
      )}

      {/* Wait for inbound #2 */}
      {out2Sent && !in2 && (
        <WaitingCard
          recipientName={out2?.recipient_name ?? out2?.recipient ?? 'recipient'}
          onSimulate={() => simulate(2)}
          simulating={simulatingTurn === 2}
        />
      )}

      {in2 && !facts2 && <ParsingCard />}
      {in2 && facts2 && <InboundCard message={in2} facts={facts2} />}

      {/* Final approval gate — only after inbound #2 parsed with attribution candidate */}
      {in2 && facts2 && in2State && (
        <FinalApprovalGate
          hasReadReplyText={in2State.hasReadReplyText}
          attributionApproved={in2State.attributionApproved}
          approvedAt={in2State.approvedAt}
          onMarkRead={in2State.markReplyTextRead}
          onApprove={in2State.approveAttribution}
        />
      )}

      {/* Resolution */}
      {finalApproved && facts2 && <ResolutionCard vin={vin} facts={facts2} />}
    </div>
  );
}
