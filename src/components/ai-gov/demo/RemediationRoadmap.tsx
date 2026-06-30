'use client';

import type { RoadmapData } from '@/types/ai-gov';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Badge } from '@/components/ai-gov/ui/badge';

const EFFORT_LABEL: Record<string, string> = { low: 'Low effort', med: 'Medium effort', high: 'High effort' };

interface Props {
  data: RoadmapData;
  filterState?: string;
}

export function RemediationRoadmap({ data, filterState }: Props) {
  const items = filterState ? data.items.filter((i) => i.state === filterState) : data.items;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Remediation roadmap{filterState ? ` — ${filterState}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground">No outstanding items for this state.</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-md border p-3 bg-card">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-medium">{item.title}</div>
              <div className="flex items-center gap-1.5">
                <Badge variant={item.severity === 'red' ? 'destructive' : 'warning'} className="text-[10px]">
                  {item.state}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">{EFFORT_LABEL[item.effort]}</Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {item.description}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
