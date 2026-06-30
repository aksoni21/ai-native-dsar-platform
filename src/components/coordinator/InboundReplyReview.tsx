'use client';

import { useEffect, useRef } from 'react';
import {
  MailOpen,
  Sparkles,
  Eye,
  Check,
  Lock,
  PlayCircle,
  ChevronRight,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CoordinatorClassificationBadge } from './CoordinatorClassificationBadge';
import type { CommunicationMessage, CommunicationExtractedFacts } from '@/types';
import type { CoordinatorInboundState } from './useCoordinatorCase';

interface InboundReplyReviewProps {
  message: CommunicationMessage;
  facts: CommunicationExtractedFacts;
  state: CoordinatorInboundState;
  /** Optional simulate-button label override. */
  simulateLabel?: string;
  /**
   * Hide the inline "Approve next action" gate. Use when the next action is
   * a separately-gated outbound draft (e.g. redirect outreach, clarification
   * email) — the parent view shows the operator approval there instead.
   */
  hideApproveGate?: boolean;
}

function formatStableDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

function formatFactKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function InboundReplyReview({
  message,
  facts,
  state,
  simulateLabel = '▶ Simulate reply received',
  hideApproveGate = false,
}: InboundReplyReviewProps) {
  const replyTextRef = useRef<HTMLDivElement | null>(null);

  // If the operator scrolls into the reply text region, count that as "read".
  useEffect(() => {
    if (state.hasReadReplyText || !state.replyRevealed) return;
    const el = replyTextRef.current;
    if (!el) return;
    const handler = () => state.markReplyTextRead();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            handler();
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [state.replyRevealed, state.hasReadReplyText, state]);

  if (!state.replyRevealed) {
    return (
      <Card className="border-dashed border-border bg-muted/20">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground/70" />
          <div>
            <p className="text-sm font-medium">Inbound reply pending</p>
            <p className="text-xs text-muted-foreground">
              The Coordinator is monitoring the privacy mailbox. Reveal the staged reply when you&apos;re ready to walk the live demo through.
            </p>
          </div>
          <Button onClick={state.revealReply} size="sm" className="gap-1.5">
            <PlayCircle className="h-3.5 w-3.5" />
            {simulateLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Inbound email — the literal reply text. Must be visible/clicked before Approve unlocks. */}
      <Card className="border-[hsl(var(--warning)/0.5)] bg-[hsl(var(--warning)/0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MailOpen className="h-4 w-4 text-[hsl(var(--warning))]" />
            Inbound — reply received
            <Badge variant="outline" className="border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))] text-[10px]">
              {formatStableDateTime(message.received_at)}
            </Badge>
            {state.hasReadReplyText ? (
              <Badge variant="outline" className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                <Eye className="mr-1 h-3 w-3" /> Reply text read
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                Not yet read
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-[68px_1fr] gap-1.5 text-xs">
            <span className="text-muted-foreground">From</span>
            <span className="font-mono">{message.sender}</span>
            <span className="text-muted-foreground">Subject</span>
            <span className="font-mono">{message.subject}</span>
          </div>
          <div
            ref={replyTextRef}
            onClick={state.markReplyTextRead}
            className={cn(
              'cursor-pointer rounded-md border-2 p-3 text-sm leading-relaxed font-mono whitespace-pre-wrap transition-colors',
              state.hasReadReplyText
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30'
                : 'border-[hsl(var(--warning)/0.6)] bg-background hover:bg-[hsl(var(--warning)/0.06)]',
            )}
            title={state.hasReadReplyText ? 'Reply text marked read' : 'Click to confirm you have read the reply'}
          >
            {message.body}
          </div>
          {!state.hasReadReplyText && (
            <p className="text-[11px] text-muted-foreground italic">
              Click into the reply above to confirm you&apos;ve read it. The Approve button below stays locked until you do — Coordinator §12 risk mitigation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coordinator parse: classification + extracted facts + candidates + recommended action */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-[hsl(var(--info))]" />
            Coordinator parse
            <CoordinatorClassificationBadge
              classification={facts.classification}
              confidence={facts.classification_confidence}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
            <span className="font-medium text-muted-foreground">Reasoning · </span>
            {facts.classification_reasoning}
          </div>

          {Object.keys(facts.extracted_facts).length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Extracted facts
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(facts.extracted_facts).map(([key, value]) => (
                      <tr key={key} className="border-b border-border/50 last:border-0">
                        <td className="bg-muted/40 px-3 py-1.5 font-medium text-muted-foreground">
                          {formatFactKey(key)}
                        </td>
                        <td className="px-3 py-1.5 font-mono">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {facts.candidate_results.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Candidate matches ({facts.candidate_results.length})
              </div>
              <ul className="space-y-2">
                {facts.candidate_results.map((c) => (
                  <li
                    key={c.source_id}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{c.candidate_label}</span>
                      <Badge variant="outline" className="border-[hsl(var(--info)/0.5)] text-[hsl(var(--info))] text-[10px] font-mono tabular-nums">
                        {c.match_score}% match
                      </Badge>
                      <span className="ml-auto text-[11px] font-mono text-muted-foreground">
                        {c.source_id}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{c.reasoning}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.06)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--info))]">
              Recommended next action
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <ChevronRight className="h-4 w-4 text-[hsl(var(--info))]" />
              {facts.recommended_action_label}
            </div>
          </div>

          {/* Approve gate */}
          {hideApproveGate ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground italic">
              Coordinator has drafted the next outbound below — approval gate lives on that draft, not here.
            </div>
          ) : !state.attributionApproved ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                size="sm"
                disabled={!state.hasReadReplyText}
                onClick={state.approveAttribution}
                className="gap-1.5"
              >
                {state.hasReadReplyText ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {state.hasReadReplyText ? 'Approve next action' : 'Read reply to unlock'}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                On approve, the post-approval execution pipeline runs the recommended action. Agent never writes.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">Approved by operator@instrata.com</span>
              <span className="ml-auto text-[11px] font-mono text-muted-foreground">
                {formatStableDateTime(state.approvedAt)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
