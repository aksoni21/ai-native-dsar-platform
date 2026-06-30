'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { cn } from '@/lib/ai-gov/utils';

interface Pain {
  code: string;
  title: string;
  features: string[];
}

interface Feature {
  id: string;
  label: string;
}

const PAINS: Pain[] = [
  {
    code: 'RM-1',
    title: 'Employees paste PHI into ChatGPT',
    features: ['browser_dlp', 'classifier', 'policy_engine'],
  },
  {
    code: 'RM-2',
    title: 'No visibility into outbound prompts',
    features: ['browser_dlp', 'audit_log', 'admin_console'],
  },
  {
    code: 'RM-3',
    title: 'No breach-ready audit trail',
    features: ['audit_log', 'admin_console'],
  },
];

const FEATURES: Feature[] = [
  { id: 'browser_dlp', label: 'Browser DLP (paste / submit interception)' },
  { id: 'classifier', label: 'PHI / PII classifier' },
  { id: 'policy_engine', label: 'Shared policy engine' },
  { id: 'audit_log', label: 'Cross-surface audit log' },
  { id: 'admin_console', label: 'Unified admin console' },
];

const ARROW_COLOR = 'hsl(260 60% 55%)';

interface Connection {
  painCode: string;
  featId: string;
  d: string;
}

export function PlatformVisionMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const painRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const featRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoverPain, setHoverPain] = useState<string | null>(null);
  const [hoverFeat, setHoverFeat] = useState<string | null>(null);

  function recompute() {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const out: Connection[] = [];
    for (const pain of PAINS) {
      const pEl = painRefs.current.get(pain.code);
      if (!pEl) continue;
      const pr = pEl.getBoundingClientRect();
      const x1 = pr.right - cr.left;
      const y1 = pr.top + pr.height / 2 - cr.top;
      for (const featId of pain.features) {
        const fEl = featRefs.current.get(featId);
        if (!fEl) continue;
        const fr = fEl.getBoundingClientRect();
        const x2 = fr.left - cr.left - 4;
        const y2 = fr.top + fr.height / 2 - cr.top;
        const midX = (x1 + x2) / 2;
        const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
        out.push({ painCode: pain.code, featId, d });
      }
    }
    setConnections(out);
  }

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(recompute, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHighlighted = (c: Connection) =>
    hoverPain === c.painCode || hoverFeat === c.featId;
  const anyHover = hoverPain !== null || hoverFeat !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">Browser DLP</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Employees pasting patient data into ChatGPT, and the capabilities that intercept it.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" style={{ color: ARROW_COLOR }} />
              <span className="font-mono">{FEATURES.length}</span>
              <span className="text-muted-foreground">capabilities planned</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Mobile: stacked pain → feature pills */}
        <div className="md:hidden space-y-2.5">
          {PAINS.map((pain) => (
            <div key={pain.code} className="rounded-md border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: ARROW_COLOR }} />
                <span className="text-xs flex-1 truncate">{pain.title}</span>
              </div>
              <div className="mt-2 pl-1 flex flex-wrap items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                {pain.features.map((fid) => {
                  const f = FEATURES.find((x) => x.id === fid);
                  if (!f) return null;
                  return (
                    <span
                      key={fid}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-[11px]"
                    >
                      {f.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: two columns + SVG arrows */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 gap-x-32 text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
            <span>Pain (today)</span>
            <span>Platform capability</span>
          </div>
          <div
            ref={containerRef}
            className="relative grid grid-cols-[1fr,128px,1fr] items-stretch gap-y-2"
          >
            <svg
              className="pointer-events-none absolute inset-0 z-0 w-full h-full"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker
                  id="instrata-arrow-planned"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={ARROW_COLOR} />
                </marker>
              </defs>
              {connections.map((c, i) => {
                const highlighted = isHighlighted(c);
                const dimmed = anyHover && !highlighted;
                return (
                  <path
                    key={`${c.painCode}-${c.featId}-${i}`}
                    d={c.d}
                    stroke={ARROW_COLOR}
                    strokeWidth={highlighted ? 2.25 : 1.5}
                    strokeOpacity={dimmed ? 0.12 : highlighted ? 1 : 0.5}
                    fill="none"
                    markerEnd="url(#instrata-arrow-planned)"
                    className="transition-all duration-150"
                  />
                );
              })}
            </svg>

            {/* LEFT: pain rows */}
            <div className="col-start-1 space-y-2 relative z-10">
              {PAINS.map((pain) => {
                const active = hoverPain === pain.code;
                return (
                  <div
                    key={pain.code}
                    ref={(el) => {
                      if (el) painRefs.current.set(pain.code, el);
                      else painRefs.current.delete(pain.code);
                    }}
                    onMouseEnter={() => setHoverPain(pain.code)}
                    onMouseLeave={() => setHoverPain(null)}
                    className={cn(
                      'rounded-md border bg-card px-3 py-2 transition-colors cursor-default',
                      active && 'ring-1',
                    )}
                    style={
                      active
                        ? { borderColor: ARROW_COLOR, boxShadow: `0 0 0 1px ${ARROW_COLOR}40` }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: ARROW_COLOR }} />
                      <span className="text-xs truncate">{pain.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="col-start-2" aria-hidden="true" />

            {/* RIGHT: planned features */}
            <div className="col-start-3 space-y-2 relative z-10">
              {FEATURES.map((feat) => {
                const active = hoverFeat === feat.id;
                return (
                  <div
                    key={feat.id}
                    ref={(el) => {
                      if (el) featRefs.current.set(feat.id, el);
                      else featRefs.current.delete(feat.id);
                    }}
                    onMouseEnter={() => setHoverFeat(feat.id)}
                    onMouseLeave={() => setHoverFeat(null)}
                    className={cn(
                      'rounded-md border bg-card px-3 py-2 transition-colors cursor-default',
                      active && 'ring-1',
                    )}
                    style={
                      active
                        ? { borderColor: ARROW_COLOR, boxShadow: `0 0 0 1px ${ARROW_COLOR}40` }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs flex-1 truncate">{feat.label}</span>
                      <Clock className="h-3 w-3 shrink-0" style={{ color: ARROW_COLOR }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-[2px] w-5 rounded-full"
                style={{ backgroundColor: ARROW_COLOR }}
              />
              Planned for v1.1+
            </span>
            {/* <span className="text-muted-foreground/70">
              Hover either side to trace which pain a capability addresses.
            </span> */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
