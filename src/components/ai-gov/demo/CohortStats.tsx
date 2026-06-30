'use client';

import { useVertical } from '@/context/ai-gov/VerticalContext';
import { Card, CardContent } from '@/components/ai-gov/ui/card';

const STATS_LENDING = [
  { label: 'CO loan decisions (12 mo)', value: '1,832' },
  { label: 'ADMT-influenced declines', value: '417' },
  { label: '§1705 reconsideration requests', value: '23' },
  { label: 'Reconsideration overturn rate', value: '34.8%' },
];

const STATS_HR = [
  { label: 'NYC candidate decisions (12 mo)', value: '2,604' },
  { label: 'AEDT-influenced screen-outs', value: '1,118' },
  { label: 'Candidate review requests', value: '41' },
  { label: 'Review overturn rate', value: '29.3%' },
];

const STATS_AUTOMOTIVE = [
  { label: 'CA connected-vehicle decisions (12 mo)', value: '342,118' },
  { label: 'ADMT-influenced finance declines', value: '2,847' },
  { label: 'Telematics-as-input flags', value: '1,409' },
  { label: 'Consumer ADMT access requests', value: '187' },
];

export function CohortStats() {
  const { vertical } = useVertical();
  const stats =
    vertical === 'lending' ? STATS_LENDING : vertical === 'hr' ? STATS_HR : STATS_AUTOMOTIVE;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="bg-card/60">
          <CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="font-serif text-2xl mt-1">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
