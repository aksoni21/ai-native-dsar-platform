'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, User, Sparkles, FileText, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { AuditData, AuditEntry, Vertical } from '@/types/ai-gov';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Badge } from '@/components/ai-gov/ui/badge';
import { Button } from '@/components/ai-gov/ui/button';
import { formatDateTime } from '@/lib/ai-gov/utils';

const ACTOR_ICON: Record<string, typeof Sparkles> = {
  system: Sparkles,
  reviewer: User,
  consumer: User,
  vendor: FileText,
  developer: FileText,
};

interface Props {
  initialAudit: AuditData;
  vertical: Vertical;
}

export function AuditTrailTable({ initialAudit, vertical }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>(initialAudit.entries);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `naica_override_${initialAudit.applicant_id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    try {
      const v = JSON.parse(raw) as { ts: string; reviewer: string; new_outcome: string };
      const newEntry: AuditEntry = {
        id: 'ae-live-override',
        ts: v.ts,
        actor: 'reviewer',
        actor_name: v.reviewer,
        action: 'live_override',
        detail: `Reviewer overturned decision in this session — new outcome: ${v.new_outcome}. Logged from /human-review.`,
        human_override: true,
      };
      if (!initialAudit.entries.some((e) => e.id === newEntry.id)) {
        setEntries([...initialAudit.entries, newEntry]);
      }
    } catch {
      // ignore
    }
  }, [initialAudit, vertical]);

  function exportCsv() {
    const header = ['id', 'ts', 'actor', 'actor_name', 'action', 'detail'];
    const rows = entries.map((e) => header.map((k) => JSON.stringify((e as any)[k] ?? '')).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${initialAudit.applicant_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span>{initialAudit.applicant_id}</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {entries.length} events
              </span>
            </CardTitle>
          </div>
          <Button onClick={exportCsv} size="sm" variant="outline" className="shrink-0">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        <ol className="relative border-l border-muted ml-4 space-y-4 pt-2">
          {entries.map((e) => {
            const Icon = ACTOR_ICON[e.actor] ?? Sparkles;
            const isOverride = !!e.human_override;
            return (
              <li key={e.id} className="ml-6">
                <span
                  className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card ${
                    isOverride ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isOverride ? <AlertCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium">{e.action.replace(/_/g, ' ')}</div>
                  {isOverride && (
                    <Badge variant="warning" className="text-[10px]">Human override</Badge>
                  )}
                  <div className="text-[10px] font-mono text-muted-foreground ml-auto">
                    {formatDateTime(e.ts)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {e.actor_name}
                </div>
                <div className="text-sm mt-1">{e.detail}</div>
                {(e.model_version || typeof e.admt_influence === 'number') && (
                  <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-2 font-mono">
                    {e.model_version && <span>model {e.model_version}</span>}
                    {typeof e.admt_influence === 'number' && (
                      <span>admt_influence {e.admt_influence.toFixed(2)}</span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
