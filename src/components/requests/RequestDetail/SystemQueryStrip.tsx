'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemBadge } from '@/components/ui/SystemBadge';
import { DATA_SOURCES, getDataSourceMeta } from '@/lib/data-sources';
import type { MatchData, RecordData } from '@/types';

interface SystemQueryStripProps {
  matches: MatchData[];
  getRecord: (id: string) => RecordData | undefined;
  active: boolean;
}

type Status = 'querying' | 'done';

interface SystemQueryState {
  sourceId: string;
  status: Status;
  recordCount: number;
  elapsedMs: number;
}

function buildInitialStates(): SystemQueryState[] {
  return Object.keys(DATA_SOURCES).map((sourceId) => ({
    sourceId,
    status: 'querying',
    recordCount: 0,
    elapsedMs: 0,
  }));
}

export default function SystemQueryStrip({
  matches,
  getRecord,
  active,
}: SystemQueryStripProps) {
  const recordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sourceId of Object.keys(DATA_SOURCES)) {
      counts[sourceId] = 0;
    }
    for (const m of matches) {
      const record = getRecord(m.record_id);
      if (!record) continue;
      counts[record.data_source] = (counts[record.data_source] || 0) + 1;
    }
    return counts;
  }, [matches, getRecord]);

  const [states, setStates] = useState<SystemQueryState[]>(buildInitialStates);

  useEffect(() => {
    if (!active) {
      setStates(buildInitialStates());
      return;
    }

    setStates(buildInitialStates());

    const timers: ReturnType<typeof setTimeout>[] = [];
    Object.entries(DATA_SOURCES).forEach(([sourceId, meta]) => {
      const t = setTimeout(() => {
        setStates((prev) =>
          prev.map((s) =>
            s.sourceId === sourceId
              ? {
                  ...s,
                  status: 'done',
                  recordCount: recordCounts[sourceId] || 0,
                  elapsedMs: meta.simulated_latency_ms,
                }
              : s,
          ),
        );
      }, meta.simulated_latency_ms);
      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [active, recordCounts]);

  if (!active) return null;

  const allDone = states.every((s) => s.status === 'done');
  const totalElapsed = Math.max(...states.map((s) => s.elapsedMs || 0));
  const totalRecords = states.reduce((sum, s) => sum + s.recordCount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          {allDone ? 'Query Complete' : 'Querying Systems in Parallel'}
          {allDone && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {totalRecords} record{totalRecords !== 1 ? 's' : ''} across{' '}
              {states.length} systems &middot; {totalElapsed}ms
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {states.map((state) => {
          const meta = getDataSourceMeta(state.sourceId);
          return (
            <div
              key={state.sourceId}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5"
            >
              <SystemBadge sourceId={state.sourceId} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {meta.friendly_name}
                  </span>
                </div>
                <div className="mt-1.5">
                  {state.status === 'querying' ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="animate-query-fill h-full bg-primary"
                          style={
                            {
                              '--query-duration': `${meta.simulated_latency_ms}ms`,
                            } as React.CSSProperties
                          }
                        />
                      </div>
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      <span className="tabular-nums">
                        {state.recordCount} record
                        {state.recordCount !== 1 ? 's' : ''} found in{' '}
                        {state.elapsedMs}ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
