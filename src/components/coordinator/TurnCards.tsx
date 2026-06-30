'use client';

// Shared turn-flow primitives for the multi-turn Coordinator views.
// Used by both OrphanInvestigationView (tab 7) and ConsumerReplyReviewView
// (tab 8). The cards are deliberately stateless — all state (send-in-flight,
// expansion, gate flags) is owned by the parent view; these components
// render against props and call back when the operator clicks.

import { useMemo, useState } from 'react';
import {
  Sparkles,
  Mail,
  Inbox,
  Loader2,
  Send,
  Check,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  ArrowRight,
  Brain,
  Quote,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoordinatorClassificationBadge } from './CoordinatorClassificationBadge';
import { cn } from '@/lib/utils';
import type { CommunicationMessage, CommunicationExtractedFacts } from '@/types';

// ─── Izzy persona strip (operating in Communications Coordinator role) ─
export function IzzyPersona() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-violet-300/70 dark:border-violet-800/70 bg-gradient-to-r from-violet-50/70 via-fuchsia-50/40 to-violet-50/30 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-violet-950/20 px-3 py-2">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950 border border-violet-300 dark:border-violet-800">
        <Mail className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight text-violet-900 dark:text-violet-100">
          Izzy · Communications Coordinator
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight">
          drafts outbound, parses replies, never writes
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] font-mono border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300">
        agent:coordinator
      </Badge>
    </div>
  );
}

// ─── Highlight palette for extracted-fact phrases ──────────────────────
export const HIGHLIGHT_COLORS = [
  'bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100',
  'bg-sky-200/60 dark:bg-sky-900/50 text-sky-900 dark:text-sky-100',
  'bg-violet-200/60 dark:bg-violet-900/50 text-violet-900 dark:text-violet-100',
  'bg-rose-200/60 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100',
  'bg-emerald-200/60 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100',
  'bg-fuchsia-200/60 dark:bg-fuchsia-900/50 text-fuchsia-900 dark:text-fuchsia-100',
  'bg-cyan-200/60 dark:bg-cyan-900/50 text-cyan-900 dark:text-cyan-100',
  'bg-orange-200/60 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100',
];

export interface Highlight {
  key: string;
  phrase: string;
  color: string;
}

export function buildHighlights(
  facts: Record<string, string> | null | undefined,
  body: string,
): { highlights: Highlight[]; derived: Array<{ key: string; value: string }> } {
  const highlights: Highlight[] = [];
  const derived: Array<{ key: string; value: string }> = [];
  if (!facts) return { highlights, derived };
  let colorIdx = 0;
  for (const [key, raw] of Object.entries(facts)) {
    const value = String(raw);
    if (!value) continue;
    if (body.includes(value)) {
      highlights.push({
        key,
        phrase: value,
        color: HIGHLIGHT_COLORS[colorIdx % HIGHLIGHT_COLORS.length],
      });
      colorIdx += 1;
    } else {
      derived.push({ key, value });
    }
  }
  return { highlights, derived };
}

export function highlightBody(body: string, highlights: Highlight[]): React.ReactNode[] {
  if (highlights.length === 0) return [<span key="0">{body}</span>];
  const sorted = [...highlights].sort((a, b) => b.phrase.length - a.phrase.length);
  const escaped = sorted.map((h) =>
    h.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = body.split(re);
  return parts.map((part, i) => {
    const match = sorted.find((h) => h.phrase === part);
    if (match) {
      return (
        <mark
          key={i}
          className={cn('rounded px-1 py-0.5 font-medium not-italic', match.color)}
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function formatStableDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

export function formatFactKey(key: string): string {
  return key.replace(/_/g, ' ');
}

// ─── Outbound card (Send button + collapsible body) ───────────────────
export function OutboundCard({
  message,
  onSend,
  sending,
  heading,
}: {
  message: CommunicationMessage;
  onSend: () => Promise<void>;
  sending: boolean;
  heading: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const sent = !!message.sent_at;

  return (
    <Card className="border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-[hsl(var(--info))]" />
          {heading}
          <Badge
            variant="outline"
            className="border-[hsl(var(--info)/0.5)] text-[hsl(var(--info))] text-[10px]"
          >
            <Sparkles className="mr-1 h-3 w-3" /> Drafted by Izzy
          </Badge>
          {sent ? (
            <Badge
              variant="outline"
              className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]"
            >
              <Check className="mr-1 h-3 w-3" /> Sent {formatStableDateTime(message.sent_at)}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="ml-auto border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px]"
            >
              Draft — awaiting send
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {expanded ? 'Hide draft' : 'Show draft'}
        </button>
        {expanded && (
          <div className="space-y-3 rounded-md border border-border bg-background p-3 text-sm">
            <div className="grid grid-cols-[88px_1fr] gap-1.5 text-xs">
              <span className="text-muted-foreground">From</span>
              <span className="font-mono">{message.sender}</span>
              <span className="text-muted-foreground">To</span>
              <span className="font-mono">
                {message.recipient_name
                  ? `${message.recipient_name} <${message.recipient}>`
                  : message.recipient}
              </span>
              <span className="text-muted-foreground">Subject</span>
              <span className="font-mono">{message.subject}</span>
            </div>
            <pre className="thin-scroll whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs leading-relaxed font-mono">
              {message.body}
            </pre>
            {!sent && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" onClick={onSend} disabled={sending} className="gap-1.5">
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {sending ? 'Sending…' : 'Send'}
                </Button>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Click to fire SMTP for real. Recipient gets the email; agent never writes.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Waiting card (polling state + canned-reply fallback) ─────────────
export const POLL_INTERVAL_MS = 5_000;

export function WaitingCard({
  recipientName,
  onSimulate,
  simulating,
}: {
  recipientName: string;
  onSimulate: () => Promise<void>;
  simulating: boolean;
}) {
  return (
    <Card className="border-dashed border-border bg-muted/20">
      <CardContent className="flex flex-col gap-3 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="font-medium">Waiting for reply from {recipientName}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-polling every {POLL_INTERVAL_MS / 1000}s. Reply to the sent email from the
          recipient&apos;s mailbox; the IMAP cron worker will ingest it within ~30s and the parser
          will classify on detect.
        </p>
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={onSimulate}
            disabled={simulating}
            className="gap-1.5"
          >
            {simulating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            {simulating ? 'Simulating…' : 'Simulate canned reply (offline fallback)'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Parsing card (between inbound arrival and facts ready) ───────────
export function ParsingCard({
  message,
}: {
  message?: string;
}) {
  return (
    <Card className="border-dashed border-border bg-muted/20">
      <CardContent className="flex items-center justify-center gap-2 py-6 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="font-medium">{message ?? 'Coordinator parsing the reply…'}</span>
      </CardContent>
    </Card>
  );
}

// ─── Inbound card (verbatim body + extraction highlights + parse output) ───
export function InboundCard({
  message,
  facts,
}: {
  message: CommunicationMessage;
  facts: CommunicationExtractedFacts;
}) {
  const { highlights, derived } = useMemo(
    () =>
      buildHighlights(facts.extracted_facts as Record<string, string>, message.body),
    [facts, message.body],
  );
  const [bodyExpanded, setBodyExpanded] = useState(true);
  const [thinkingExpanded, setThinkingExpanded] = useState(true);

  return (
    <div className="space-y-3">
      {/* Email body verbatim, with extraction highlights */}
      <Card className="border-[hsl(var(--warning)/0.5)] bg-[hsl(var(--warning)/0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <Inbox className="h-4 w-4 text-[hsl(var(--warning))]" />
            Inbound — reply received
            <Badge
              variant="outline"
              className="border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))] text-[10px]"
            >
              {formatStableDateTime(message.received_at)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <button
            type="button"
            onClick={() => setBodyExpanded((e) => !e)}
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {bodyExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {bodyExpanded ? 'Hide reply' : 'Show reply'}
          </button>
          {bodyExpanded && (
            <div className="space-y-3">
              <div className="grid grid-cols-[68px_1fr] gap-1.5 text-xs">
                <span className="text-muted-foreground">From</span>
                <span className="font-mono">{message.sender}</span>
                <span className="text-muted-foreground">Subject</span>
                <span className="font-mono">{message.subject}</span>
              </div>
              <pre className="thin-scroll whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm leading-relaxed font-mono">
                {highlightBody(message.body, highlights)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parser output — agent thinking */}
      <Card className="border-violet-300/70 dark:border-violet-800/70 bg-gradient-to-br from-violet-50/70 via-fuchsia-50/40 to-violet-50/30 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-violet-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-violet-900 dark:text-violet-100">Izzy is thinking</span>
            <Badge
              variant="outline"
              className="border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300 text-[10px]"
            >
              <Sparkles className="mr-1 h-3 w-3" /> Izzy · sub-agent: inbound-parser
            </Badge>
            <CoordinatorClassificationBadge
              classification={facts.classification}
              confidence={facts.classification_confidence}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <button
            type="button"
            onClick={() => setThinkingExpanded((e) => !e)}
            className="mb-2 flex items-center gap-1.5 text-xs text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100"
          >
            {thinkingExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {thinkingExpanded ? 'Hide reasoning + extraction' : 'Show reasoning + extraction'}
          </button>
          {thinkingExpanded && (
            <div className="space-y-3">
              {/* Agent reasoning — quoted, distinct from extraction */}
              <div className="rounded-md border-l-2 border-violet-400 dark:border-violet-600 bg-background/60 p-3 text-xs leading-relaxed">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  <Quote className="h-3 w-3" />
                  Izzy&apos;s reasoning
                </div>
                <p className="italic text-foreground/90">
                  &ldquo;{facts.classification_reasoning}&rdquo;
                </p>
              </div>

              {(highlights.length > 0 || derived.length > 0) && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    What the parser extracted
                  </div>
                  <div className="space-y-1.5">
                    {highlights.map((h) => (
                      <div key={h.key} className="flex flex-wrap items-baseline gap-2">
                        <mark
                          className={cn(
                            'rounded px-1 py-0.5 font-mono not-italic',
                            h.color,
                          )}
                        >
                          {h.phrase}
                        </mark>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-muted-foreground">
                          {formatFactKey(h.key)}
                        </span>
                        <span className="ml-auto text-[10px] italic text-muted-foreground">
                          lifted verbatim
                        </span>
                      </div>
                    ))}
                    {derived.map((d) => (
                      <div key={d.key} className="flex flex-wrap items-baseline gap-2">
                        <span className="rounded border border-dashed border-border bg-background px-1 py-0.5 font-mono text-muted-foreground">
                          {d.value}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-muted-foreground">
                          {formatFactKey(d.key)}
                        </span>
                        <span className="ml-auto text-[10px] italic text-muted-foreground">
                          paraphrased / context
                        </span>
                      </div>
                    ))}
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
                          <Badge
                            variant="outline"
                            className="border-[hsl(var(--info)/0.5)] text-[hsl(var(--info))] text-[10px] font-mono tabular-nums"
                          >
                            {c.match_score}% match
                          </Badge>
                          <span className="ml-auto text-[11px] font-mono text-muted-foreground">
                            {c.source_id}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                          {c.reasoning}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-md border border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.06)] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--info))]">
                  Recommended next action:
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  {facts.recommended_action_label}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
