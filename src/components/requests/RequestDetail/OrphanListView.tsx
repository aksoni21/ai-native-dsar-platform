'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getOrphanVins } from '@/lib/data';
import type { OrphanVin } from '@/types';

interface OrphanListViewProps {
  /** Highlighted VIN — the one with an active Coordinator investigation. */
  highlightVin?: string;
  /** When operator clicks an orphan, switch focused stage to coordinator_outreach. */
  onSelect?: (vin: string) => void;
}

const STATUS_BADGE: Record<OrphanVin['status'], string> = {
  open: 'border-border text-muted-foreground',
  investigating: 'border-[hsl(var(--info)/0.5)] bg-[hsl(var(--info)/0.08)] text-[hsl(var(--info))]',
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

export default function OrphanListView({ highlightVin, onSelect }: OrphanListViewProps) {
  const orphans = getOrphanVins();
  const total = orphans.reduce((acc, o) => acc + o.record_count, 0);

  return (
    <div className="space-y-4">
      <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Orphan VINs — proactive privacy hygiene
            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-[10px]">
              {orphans.length} VINs · {total.toLocaleString()} records · 0 person attributions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground leading-relaxed">
          <ul className="list-disc space-y-1 pl-5">
            <li>Weekly sweep — VIN-keyed records with no person attribution</li>
            <li>Probes internal systems (Legacy CRM archive, dealer-network feeds, connected vehicle platform)</li>
            <li>Click an orphan to open the Coordinator investigation</li>
          </ul>
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {orphans.map((o) => {
          const isHighlight = highlightVin === o.vin;
          return (
            <li key={o.vin}>
              <button
                type="button"
                onClick={() => onSelect?.(o.vin)}
                className={cn(
                  'group flex w-full flex-col items-stretch gap-2 rounded-md border bg-background p-3 text-left transition-colors',
                  isHighlight
                    ? 'border-[hsl(var(--info)/0.5)] bg-[hsl(var(--info)/0.05)] hover:bg-[hsl(var(--info)/0.1)]'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-[hsl(var(--info))]">{o.vin}</span>
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_BADGE[o.status])}>
                    {o.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {o.record_count.toLocaleString()} records
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Cause:</span> {o.likely_cause}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span>
                    <span className="text-muted-foreground/70">first seen </span>
                    <span className="font-mono">{o.first_seen}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground/70">last attribution attempt </span>
                    <span className="font-mono">{o.last_attribution_date ?? '—'}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground/70">sources </span>
                    <span>{o.source_systems.join(', ')}</span>
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
