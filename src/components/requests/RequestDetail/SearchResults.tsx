"use client";

import { useEffect, useState } from 'react';
import { Car, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemBadge } from '@/components/ui/SystemBadge';
import { getDataSourceMeta } from '@/lib/data-sources';
import { cn } from '@/lib/utils';
import type { MatchData, RecordData } from '@/types';

interface SearchResultsProps {
  matches: MatchData[];
  getRecord: (id: string) => RecordData | undefined;
}

export default function SearchResults({
  matches,
  getRecord,
}: SearchResultsProps) {
  // Group matches by data source
  const grouped: Record<string, { match: MatchData; record: RecordData }[]> = {};
  for (const match of matches) {
    const record = getRecord(match.record_id);
    if (!record) continue;
    const source = record.data_source;
    if (!grouped[source]) grouped[source] = [];
    grouped[source].push({ match, record });
  }
  const sourceKeys = Object.keys(grouped);

  // Default every source group to expanded; auto-expand any new sources that
  // arrive later (e.g. live-mode matches streaming in).
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    () => new Set(sourceKeys),
  );
  useEffect(() => {
    setExpandedSources((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const k of sourceKeys) {
        if (!next.has(k)) {
          next.add(k);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [sourceKeys.join('|')]);

  const toggleSource = (source: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  return (
    <Card data-tour="search-results">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Search Results
          <Badge variant="secondary" className="ml-2">
            {matches.length} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(grouped).map(([source, items]) => {
          const isExpanded = expandedSources.has(source);

          return (
            <div
              key={source}
              className="rounded-lg border"
            >
              <button
                onClick={() => toggleSource(source)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <SystemBadge sourceId={source} />
                  <span className="font-medium">{getDataSourceMeta(source).friendly_name}</span>
                </div>
                <Badge variant="outline">{items.length} records</Badge>
              </button>

              {isExpanded && (
                <div className="border-t px-4 py-2 space-y-2">
                  {items.map(({ record }) => {
                    const vin =
                      typeof record.raw_data?.vin === 'string' ? record.raw_data.vin : null;
                    return (
                      <div
                        key={record.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2',
                          vin &&
                            'bg-sky-50/60 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:ring-sky-900',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {record.first_name} {record.last_name}
                          </p>
                          {record.email && (
                            <p className="text-xs text-muted-foreground">
                              {record.email}
                            </p>
                          )}
                        </div>
                        <div className="w-[200px] flex-shrink-0 text-center">
                          {vin && (
                            <p
                              className="flex items-center justify-center gap-1 font-mono text-[11px] text-sky-700 dark:text-sky-300"
                              title="VIN found in this record — seeds the VIN-Expand step"
                            >
                              <Car className="h-3 w-3" />
                              {vin}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">
                          {record.record_type}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
