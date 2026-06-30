'use client';

import { useState } from 'react';
import {
  Mail,
  Send,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CommunicationMessage } from '@/types';
import type { CoordinatorOutboundState } from './useCoordinatorCase';

interface OutboundDraftReviewProps {
  message: CommunicationMessage;
  state: CoordinatorOutboundState;
  /** When true, the original outbound is collapsed by default (used in inbound-reply contexts). */
  collapsedByDefault?: boolean;
  /** Custom heading override. */
  heading?: string;
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

export function OutboundDraftReview({
  message,
  state,
  collapsedByDefault = false,
  heading,
}: OutboundDraftReviewProps) {
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [editing, setEditing] = useState(false);
  const [draftSubject, setDraftSubject] = useState(message.subject);
  const [draftBody, setDraftBody] = useState(message.body);

  const sent = state.approved && (state.approvedAt || message.sent_at);

  return (
    <Card className="border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-[hsl(var(--info))]" />
          {heading ?? 'Outbound — Coordinator-drafted'}
          {message.agent_drafted && (
            <Badge variant="outline" className="border-[hsl(var(--info)/0.5)] text-[hsl(var(--info))] text-[10px]">
              <Sparkles className="mr-1 h-3 w-3" /> agent:coordinator
            </Badge>
          )}
          {sent && (
            <Badge variant="outline" className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
              <Check className="mr-1 h-3 w-3" /> Sent {formatStableDateTime(state.approvedAt ?? message.sent_at)}
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
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {expanded ? 'Hide draft' : 'Show draft'}
        </button>

        {expanded && (
          <div className="space-y-3 rounded-md border border-border bg-background p-3 text-sm">
            <div className="grid grid-cols-[88px_1fr] gap-1.5 text-xs">
              <span className="text-muted-foreground">From</span>
              <span className="font-mono">{message.sender}</span>
              <span className="text-muted-foreground">To</span>
              <span className="font-mono">
                {message.recipient_name ? `${message.recipient_name} <${message.recipient}>` : message.recipient}
              </span>
              <span className="text-muted-foreground">Subject</span>
              {editing ? (
                <input
                  className="rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                />
              ) : (
                <span className="font-mono">{draftSubject}</span>
              )}
            </div>

            {editing ? (
              <textarea
                className="thin-scroll min-h-[160px] w-full rounded border border-border bg-background p-2 text-xs leading-relaxed font-mono"
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
              />
            ) : (
              <pre className="thin-scroll whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs leading-relaxed font-mono">
                {draftBody}
              </pre>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!sent && (
                <Button
                  size="sm"
                  onClick={state.approveOutbound}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Approve & Send
                </Button>
              )}
              {!sent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing((e) => !e)}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editing ? 'Stop editing' : 'Edit'}
                </Button>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
                Drafted by Coordinator · agent is read-only · this approve is the human-approval gate.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
