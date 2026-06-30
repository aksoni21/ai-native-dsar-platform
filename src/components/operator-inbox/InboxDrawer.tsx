'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Mail,
  MailOpen,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Inbox,
  Sparkles,
  Send,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CommunicationCase, CommunicationMessage } from '@/types';

interface OperatorInquiryThread {
  case: CommunicationCase;
  inbound: CommunicationMessage | null;
  outbound: CommunicationMessage | null;
}

interface InboxDrawerProps {
  open: boolean;
  onClose: () => void;
}

const POLL_INTERVAL_MS = 8_000;

function formatStableDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

export function InboxDrawer({ open, onClose }: InboxDrawerProps) {
  const [threads, setThreads] = useState<OperatorInquiryThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [triggeringCron, setTriggeringCron] = useState(false);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operator-inbox', { cache: 'no-store' });
      if (!res.ok) throw new Error(`feed returned ${res.status}`);
      const data = (await res.json()) as { threads: OperatorInquiryThread[] };
      setThreads(data.threads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Poll while drawer is open.
  useEffect(() => {
    if (!open) return;
    refresh(true);
    const id = setInterval(() => refresh(false), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [open, refresh]);

  const [pollFeedback, setPollFeedback] = useState<string | null>(null);
  const [pollFeedbackKind, setPollFeedbackKind] = useState<'info' | 'success' | 'error'>('info');

  // Manually trigger the IMAP cron from the drawer. Hits the same-origin
  // /api/operator-inbox/poll endpoint (auth-free demo affordance). The
  // server runs `ingestReplies()` and returns the count of newly-ingested
  // messages so we can surface immediate feedback.
  //
  // Feedback strip is set immediately ("Polling…") so the operator sees
  // something happening even though the cron + Izzy's handler can take
  // 30-60s. After the response lands, the feedback flips to a result
  // string. Feedback is NOT auto-cleared — it sticks until the next
  // poll — so an operator who looks away doesn't miss the result.
  const triggerCron = useCallback(async () => {
    setTriggeringCron(true);
    setPollFeedbackKind('info');
    setPollFeedback('Polling IMAP… Izzy may take 30–60s if a new ask arrives.');
    try {
      const res = await fetch('/api/operator-inbox/poll', { method: 'POST' });
      if (!res.ok) {
        setPollFeedbackKind('error');
        setPollFeedback(`Poll failed (${res.status})`);
      } else {
        const data = (await res.json()) as {
          ingested?: number;
          skipped?: number;
          errors?: number;
        };
        const ing = data.ingested ?? 0;
        const err = data.errors ?? 0;
        if (ing === 0 && err === 0) {
          setPollFeedbackKind('info');
          setPollFeedback('Polled — no new mail for Izzy.');
        } else if (err > 0) {
          setPollFeedbackKind('error');
          setPollFeedback(`Polled — ingested ${ing}, ${err} error(s).`);
        } else {
          setPollFeedbackKind('success');
          setPollFeedback(`Polled — ${ing} new email${ing === 1 ? '' : 's'} ingested. Izzy's reply is on its way back to the sender.`);
        }
      }
    } catch (err) {
      setPollFeedbackKind('error');
      setPollFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setTriggeringCron(false);
      refresh(false);
    }
  }, [refresh]);

  const unreadCount = useMemo(
    () => threads.filter((t) => !t.outbound).length,
    [threads],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
        role="dialog"
        aria-label="Izzy operator inbox"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Izzy&apos;s operator inbox</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Async email loop · {threads.length} thread{threads.length === 1 ? '' : 's'}
              {unreadCount > 0 ? ` · ${unreadCount} pending reply` : ''}
            </p>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => triggerCron()}
            disabled={triggeringCron}
            className="gap-1.5"
            title="Run the IMAP cron now — fetch new mail and let Izzy reply"
          >
            {triggeringCron ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>{triggeringCron ? 'Polling…' : 'Poll for new mail'}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {(error || pollFeedback) && (
          <div
            className={cn(
              'flex items-start gap-2 border-b px-4 py-2 text-xs',
              error || pollFeedbackKind === 'error'
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : pollFeedbackKind === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
            )}
          >
            {triggeringCron && (
              <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{error ?? pollFeedback}</span>
            {!triggeringCron && pollFeedback && (
              <button
                type="button"
                onClick={() => setPollFeedback(null)}
                className="flex-shrink-0 opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Thread list */}
        <div className="thin-scroll flex-1 overflow-y-auto px-3 py-3">
          {loading && threads.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-muted-foreground">
              <MailOpen className="h-6 w-6 text-muted-foreground/40" />
              <p className="max-w-[260px] leading-relaxed">
                No operator emails yet. Email Izzy at the configured mailbox from any allowlisted
                sender — she&apos;ll read the request, run her tools, and reply. Threads appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => (
                <ThreadCard
                  key={t.case.id}
                  thread={t}
                  expanded={!!expanded[t.case.id]}
                  onToggle={() =>
                    setExpanded((prev) => ({ ...prev, [t.case.id]: !prev[t.case.id] }))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function ThreadCard({
  thread,
  expanded,
  onToggle,
}: {
  thread: OperatorInquiryThread;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ctx = thread.case.application_context as {
    sender?: string;
    original_subject?: string;
  };
  const sender = thread.inbound?.sender ?? ctx.sender ?? '(unknown)';
  const subject = thread.inbound?.subject ?? ctx.original_subject ?? '(no subject)';
  const replied = !!thread.outbound;

  return (
    <div
      className={cn(
        'rounded-md border bg-background',
        replied
          ? 'border-emerald-300/60 dark:border-emerald-800/60'
          : 'border-amber-300/60 dark:border-amber-800/60',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/30"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{subject}</span>
            {replied ? (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                replied
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
              >
                pending
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-mono">
            From {sender} · {formatStableDateTime(thread.inbound?.received_at ?? thread.case.created_at)}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          {thread.inbound && (
            <div className="rounded-md border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <Mail className="h-3 w-3" />
                Inbound from operator
              </div>
              <pre className="thin-scroll whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {thread.inbound.body}
              </pre>
            </div>
          )}

          {thread.outbound ? (
            <div className="rounded-md border border-violet-300/70 dark:border-violet-800/70 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/30 dark:from-violet-950/30 dark:to-fuchsia-950/20 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                <Bot className="h-3 w-3" />
                Izzy&apos;s reply · {formatStableDateTime(thread.outbound.sent_at)}
              </div>
              <div className="mb-2 text-[11px] text-muted-foreground font-mono">
                Subject: {thread.outbound.subject}
              </div>
              <pre className="thin-scroll whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {thread.outbound.body}
              </pre>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Send className="h-2.5 w-2.5" /> sent via SMTP
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Izzy · agent:coordinator
                </Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-amber-300/60 bg-amber-50/30 dark:border-amber-800/60 dark:bg-amber-950/20 px-3 py-2 text-xs italic text-muted-foreground">
              Izzy hasn&apos;t replied yet. If the cron just polled, the handler may still be
              running — refresh in a few seconds.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
