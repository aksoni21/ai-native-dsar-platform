'use client';

import { CalendarSearch, CheckCircle2, XCircle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getOwnershipsForConsumer,
  getVinKeyedRecordsForVin,
  vinKeyedSummary,
} from '@/lib/data';
import { getDataSourceMeta } from '@/lib/data-sources';
import type { RequestData, VinKeyedRecord } from '@/types';

interface VinKeyedSearchViewProps {
  request: RequestData;
}

interface BySource {
  source: string;
  inWindow: VinKeyedRecord[];
  outOfWindow: VinKeyedRecord[];
}

function formatStableDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function describePayload(rec: VinKeyedRecord): string {
  const p = rec.payload as Record<string, unknown>;
  const bits: string[] = [];
  if (rec.type) bits.push(rec.type);
  if (typeof p.fault_code === 'string') bits.push(`fault ${p.fault_code}`);
  if (typeof p.event === 'string') bits.push(String(p.event));
  if (typeof p.speed_mph === 'number') bits.push(`${p.speed_mph} mph`);
  if (typeof p.shop === 'string') bits.push(String(p.shop));
  if (typeof p.service_type === 'string') bits.push(String(p.service_type));
  if (typeof p.campaign === 'string') bits.push(String(p.campaign));
  if (typeof p.test === 'string') bits.push(String(p.test));
  if (typeof p.plant === 'string') bits.push(`plant: ${p.plant}`);
  return bits.join(' · ');
}

export default function VinKeyedSearchView({ request }: VinKeyedSearchViewProps) {
  const ownerships = getOwnershipsForConsumer(request.consumer_name);

  if (ownerships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <CalendarSearch className="h-6 w-6 text-muted-foreground/60" />
        <p className="max-w-sm text-sm text-muted-foreground">
          VIN-User search did not fire — no vehicle ownership data on file for this consumer.
        </p>
      </div>
    );
  }

  const own = ownerships[0]; // demo handles single-VIN case
  const allRecords = getVinKeyedRecordsForVin(own.vin);
  const summary = (vinKeyedSummary as Record<string, {
    total_records: number;
    in_window_count: number;
    out_of_window_count: number;
    displayed_sample: number;
    by_source: Record<string, { total: number; in_window: number; out_of_window: number }>;
  }>)[own.vin];

  const bySource: BySource[] = Object.keys(summary?.by_source ?? {}).map((source) => ({
    source,
    inWindow: allRecords.filter((r) => r.source === source && r.in_window),
    outOfWindow: allRecords.filter((r) => r.source === source && !r.in_window),
  }));

  return (
    <div className="space-y-4">
      <Card className="border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <CalendarSearch className="h-4 w-4 text-[hsl(var(--info))]" />
            VIN-User Search
            <Badge variant="outline" className="border-[hsl(var(--info)/0.5)] text-[hsl(var(--info))] text-[10px] font-mono">
              {own.vin}
            </Badge>
            <span className="text-xs font-normal text-muted-foreground">· {own.vehicle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Ownership-window timeline — what was previously a separate VIN-Expand stage. */}
          <div className="rounded-md border border-border bg-background p-3">
            {/* <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ownership window
            </div> */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {own.previous_owner && (
                <div className="flex flex-col items-start text-xs">
                  {/* <span className="text-[10px] uppercase tracking-wide text-rose-700/80 dark:text-rose-400/80">
                   · previous owner
                  </span> */}
                  <span className="mt-0.5 font-medium text-rose-700 dark:text-rose-300">
                   {own.previous_owner}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ◀ until {own.start_date}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-center rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-2 py-1.5 text-xs">
                {/* <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  this consumer
                </span> */}
                <span className="mt-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                  {own.consumer_name}
                </span>
                <span className="font-mono text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                  {own.start_date} → {own.end_date ?? 'present'}
                </span>
              </div>
              {own.next_owner && (
                <div className="flex flex-col items-end text-xs">
                  {/* <span className="text-[10px] uppercase tracking-wide text-rose-700/80 dark:text-rose-400/80">
                    after · next owner 
                  </span> */}
                  <span className="mt-0.5 font-medium text-rose-700 dark:text-rose-300">
                    {own.next_owner} 
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    from {own.end_date} ▶
                  </span>
                </div>
              )}
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total records
                </div>
                <div className="mt-1 font-mono text-2xl tabular-nums">
                  {summary.total_records.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  across {Object.keys(summary.by_source).length} VIN-only sources
                </div>
              </div>
              <div className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3">
                {/* <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  In-window
                </div> */}
                <div className="mt-1 font-mono text-2xl tabular-nums text-emerald-700 dark:text-emerald-300">
                  {summary.in_window_count.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  pulled into the DSAR scope
                </div>
              </div>
              <div className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 p-3">
                <div className="mt-1 font-mono text-2xl tabular-nums text-rose-700 dark:text-rose-300">
                  {summary.out_of_window_count.toLocaleString()}
                </div>
                <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                  other owners records
                </div>
              </div>
              
            </div>
          )}
          {/* <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Name-only search would have missed all these. Records before {own.start_date} (previous owner) and after {own.end_date} (next owner)
            are explicitly excluded with a stated reason.
          </p> */}
        </CardContent>
      </Card>

      {bySource.map(({ source, inWindow, outOfWindow }) => {
        const sourceSummary = summary?.by_source[source];
        return (
          <Card key={source}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                {getDataSourceMeta(source).friendly_name}
                {/* {sourceSummary && (
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {sourceSummary.in_window} in / {sourceSummary.out_of_window} out · {sourceSummary.total} total
                  </span>
                )} */}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                {/* <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> In window
                </div> */}
                {inWindow.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No in-window records from this source.
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {inWindow.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-md border border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                            {formatStableDate(r.timestamp)}
                          </span>
                          <span className="text-foreground">{describePayload(r)}</span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{r.id}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                {/* <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                  <XCircle className="h-3 w-3" /> Excluded — out of window
                </div> */}
                {outOfWindow.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No out-of-window records from this source.
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {outOfWindow.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-md border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20 px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-[11px] text-rose-700 dark:text-rose-300 line-through">
                            {formatStableDate(r.timestamp)}
                          </span>
                          <span className="text-muted-foreground line-through">{describePayload(r)}</span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{r.id}</span>
                        </div>
                        {r.exclusion_reason && (
                          <div className="mt-0.5 text-[11px] text-rose-700/80 dark:text-rose-300/80 italic">
                            {r.exclusion_reason}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
