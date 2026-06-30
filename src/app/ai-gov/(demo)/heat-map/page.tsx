'use client';

import { useState } from 'react';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getHeatmap, getRoadmap } from '@/lib/ai-gov/data';
import { StateHeatMap } from '@/components/ai-gov/demo/StateHeatMap';
import { RemediationRoadmap } from '@/components/ai-gov/demo/RemediationRoadmap';
import { Button } from '@/components/ai-gov/ui/button';

export default function HeatMapPage() {
  const { vertical } = useVertical();
  const heatmap = getHeatmap(vertical);
  const roadmap = getRoadmap(vertical);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Multi-state heat map</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Where you stand across active jurisdictions — and what closes the gaps.
        </p>
      </header>

      <StateHeatMap data={heatmap} onStateClick={(s) => setFilter(s.code)} />

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {filter ? `Filtered: ${filter}` : 'All outstanding items'}
        </div>
        {filter && (
          <Button size="sm" variant="ghost" onClick={() => setFilter(undefined)}>
            Show all
          </Button>
        )}
      </div>
      <RemediationRoadmap data={roadmap} filterState={filter} />
    </div>
  );
}
