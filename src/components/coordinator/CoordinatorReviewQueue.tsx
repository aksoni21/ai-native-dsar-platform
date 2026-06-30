'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Mail, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommunicationCase } from '@/types';

interface QueueRow {
  caseId: string;
  application: CommunicationCase['application'];
  state: CommunicationCase['state'];
  headline: string;
  subheadline: string;
  receivedAt?: string;
  highlight?: boolean;
  onClick?: () => void;
}

const APP_LABEL: Record<CommunicationCase['application'], string> = {
  orphan_vin: 'Orphan VIN investigation',
  consumer_dsar: 'Consumer DSAR reply',
  operator_inquiry: 'Operator email — Izzy reply',
};

const STATE_LABEL: Record<CommunicationCase['state'], string> = {
  drafted: 'Drafted',
  approved: 'Approved',
  sent: 'Sent — awaiting reply',
  awaiting_reply: 'Awaiting reply',
  reply_received: 'Reply received',
  in_review: 'In review',
  resolved: 'Resolved',
  closed_no_response: 'Closed (no response)',
};

function formatStableDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

interface CoordinatorReviewQueueProps {
  rows: QueueRow[];
  title?: string;
}

export function CoordinatorReviewQueue({ rows, title = 'Coordinator review queue' }: CoordinatorReviewQueueProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          No Coordinator cases waiting for review.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-[hsl(var(--info))]" />
          {title}
          <Badge variant="secondary" className="ml-2">
            {rows.length} {rows.length === 1 ? 'case' : 'cases'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.caseId}
            type="button"
            onClick={row.onClick}
            className={cn(
              'group flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-left transition-colors',
              row.highlight
                ? 'border-[hsl(var(--info)/0.5)] bg-[hsl(var(--info)/0.05)] hover:bg-[hsl(var(--info)/0.1)]'
                : 'border-border hover:bg-muted/40',
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold truncate">{row.headline}</span>
                <Badge variant="outline" className="text-[10px]">
                  {APP_LABEL[row.application]}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))]">
                  {STATE_LABEL[row.state]}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{row.subheadline}</p>
              {row.receivedAt && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatStableDateTime(row.receivedAt)}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors flex-shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
