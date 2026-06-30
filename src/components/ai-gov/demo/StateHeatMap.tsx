'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { HeatmapData, StateHeatEntry } from '@/types/ai-gov';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Badge } from '@/components/ai-gov/ui/badge';
import { cn } from '@/lib/ai-gov/utils';

const ComposableMap = dynamic(
  () => import('react-simple-maps').then((m) => m.ComposableMap),
  { ssr: false }
);
const Geographies = dynamic(
  () => import('react-simple-maps').then((m) => m.Geographies),
  { ssr: false }
);
const Geography = dynamic(
  () => import('react-simple-maps').then((m) => m.Geography),
  { ssr: false }
);

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const COLOR: Record<string, string> = {
  green: '#16a34a',
  yellow: '#f59e0b',
  red: '#dc2626',
  na: '#e5e7eb',
};

const COLOR_DARK: Record<string, string> = {
  green: '#15803d',
  yellow: '#b45309',
  red: '#991b1b',
  na: '#27272a',
};

const NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

interface Props {
  data: HeatmapData;
  onStateClick?: (entry: StateHeatEntry) => void;
}

export function StateHeatMap({ data, onStateClick }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const map = new Map(data.states.map((s) => [s.code, s]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Compliance posture</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <Legend label="Compliant" color="green" />
            <Legend label="Gaps" color="yellow" />
            <Legend label="Non-compliant" color="red" />
            <Legend label="N/A" color="na" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30">
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 900 }}
            width={780}
            height={420}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={TOPO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo) => {
                  const code = NAME_TO_CODE[geo.properties.name];
                  const entry = code ? map.get(code) : undefined;
                  const fill = entry ? COLOR[entry.status] : '#f4f4f5';
                  const fillDark = entry ? COLOR_DARK[entry.status] : '#18181b';
                  const isActive = data.active_jurisdictions.includes(code as any);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHover(code ?? null)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => entry && onStateClick?.(entry)}
                      style={{
                        default: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.6,
                          outline: 'none',
                          opacity: isActive ? 1 : 0.45,
                          cursor: entry ? 'pointer' : 'default',
                        },
                        hover: {
                          fill,
                          stroke: '#0ea5e9',
                          strokeWidth: 1,
                          outline: 'none',
                          opacity: 1,
                        },
                        pressed: { fill, outline: 'none' },
                      }}
                      className={cn('dark:[fill:' + fillDark + ']')}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.states.map((s) => (
            <button
              key={s.code}
              onClick={() => onStateClick?.(s)}
              className={cn(
                'rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50',
                hover === s.code && 'ring-1 ring-primary'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm font-semibold">{s.code}</div>
                <Badge
                  variant={
                    s.status === 'red'
                      ? 'destructive'
                      : s.status === 'yellow'
                      ? 'warning'
                      : s.status === 'green'
                      ? 'success'
                      : 'secondary'
                  }
                  className="text-[10px]"
                >
                  {s.label || s.status}
                </Badge>
              </div>
              {s.gaps.length > 0 && (
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {s.gaps.map((g) => (
                    <li key={g}>· {g}</li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: COLOR[color] }}
      />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
