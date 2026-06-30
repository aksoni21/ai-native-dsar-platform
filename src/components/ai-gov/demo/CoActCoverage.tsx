'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { cn } from '@/lib/ai-gov/utils';
import { ROUTE_PREFIX } from '@/lib/ai-gov/constants';

type Coverage = 'covered' | 'v1_1';

interface Requirement {
  code: string;
  title: string;
  coverage: Coverage;
  features: string[];
}

interface Feature {
  id: string;
  label: string;
  href: string;
}

const REQUIREMENTS: Requirement[] = [
  {
    code: '§1701',
    title: 'Definitions & Covered ADMT',
    coverage: 'covered',
    features: ['inventory', 'classification'],
  },
  {
    code: '§1702',
    title: 'Developer documentation',
    coverage: 'covered',
    features: ['vendor_vault'],
  },
  {
    code: '§1703',
    title: 'Deployer risk management',
    coverage: 'covered',
    features: ['audit_trail', 'heat_map'],
  },
  {
    code: '§1704',
    title: 'Consumer notice (pre + post)',
    coverage: 'covered',
    features: ['pre_decision', 'adverse_outcome'],
  },
  {
    code: '§1705',
    title: 'Right to correct + reconsider',
    coverage: 'covered',
    features: ['human_review'],
  },
  {
    code: '§1706',
    title: 'AG enforcement + 60-day cure',
    coverage: 'v1_1',
    features: ['ag_packet'],
  },
  {
    code: '§1707',
    title: 'Void contract provisions',
    coverage: 'covered',
    features: ['contract_scan'],
  },
  {
    code: '§1708',
    title: 'Carve-outs (insurer, FDA)',
    coverage: 'v1_1',
    features: ['classification'],
  },
];

const FEATURES: Feature[] = [
  { id: 'inventory', label: 'AI Inventory', href: `${ROUTE_PREFIX}/inventory` },
  { id: 'classification', label: 'Classification', href: `${ROUTE_PREFIX}/classification` },
  { id: 'vendor_vault', label: 'Vendor Vault', href: `${ROUTE_PREFIX}/vendor-vault` },
  { id: 'audit_trail', label: 'Audit Trail', href: `${ROUTE_PREFIX}/audit-trail` },
  { id: 'heat_map', label: 'Heat Map', href: `${ROUTE_PREFIX}/heat-map` },
  { id: 'pre_decision', label: 'Pre-Decision Notice', href: `${ROUTE_PREFIX}/pre-decision` },
  { id: 'adverse_outcome', label: 'Adverse Outcome', href: `${ROUTE_PREFIX}/adverse-outcome` },
  { id: 'human_review', label: 'Human Review', href: `${ROUTE_PREFIX}/human-review` },
  { id: 'ag_packet', label: 'AG Response Packet', href: `${ROUTE_PREFIX}/dashboard` },
  { id: 'contract_scan', label: 'Vendor Contract Scan', href: `${ROUTE_PREFIX}/inventory` },
];

const COVERAGE_META: Record<Coverage, { Icon: typeof Check; iconCls: string; stroke: string }> = {
  covered: { Icon: Check, iconCls: 'text-success', stroke: 'hsl(150 60% 35%)' },
  v1_1: { Icon: Clock, iconCls: 'text-warning', stroke: 'hsl(38 90% 50%)' },
};

interface Connection {
  reqCode: string;
  featId: string;
  d: string;
  coverage: Coverage;
}

export function CoActCoverage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reqRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const featRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoverReq, setHoverReq] = useState<string | null>(null);
  const [hoverFeat, setHoverFeat] = useState<string | null>(null);

  function recompute() {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const out: Connection[] = [];
    for (const req of REQUIREMENTS) {
      const reqEl = reqRefs.current.get(req.code);
      if (!reqEl) continue;
      const rr = reqEl.getBoundingClientRect();
      const x1 = rr.right - cr.left;
      const y1 = rr.top + rr.height / 2 - cr.top;
      for (const featId of req.features) {
        const featEl = featRefs.current.get(featId);
        if (!featEl) continue;
        const fr = featEl.getBoundingClientRect();
        const x2 = fr.left - cr.left - 4; // stop just before card edge so arrowhead is visible
        const y2 = fr.top + fr.height / 2 - cr.top;
        const midX = (x1 + x2) / 2;
        const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
        out.push({ reqCode: req.code, featId, d, coverage: req.coverage });
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

  // recompute after font load (DM Serif etc. shift layout)
  useEffect(() => {
    const t = setTimeout(recompute, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coveredCount = REQUIREMENTS.filter((r) => r.coverage === 'covered').length;
  const v11Count = REQUIREMENTS.filter((r) => r.coverage === 'v1_1').length;

  const isHighlighted = (c: Connection) =>
    hoverReq === c.reqCode || hoverFeat === c.featId;
  const anyHover = hoverReq !== null || hoverFeat !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">Colorado SB 26-189 coverage</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each statutory requirement → the demo feature that delivers it. Hover either side to trace.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 text-success" />
              <span className="font-mono">{coveredCount}</span>
              <span className="text-muted-foreground">covered</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-warning" />
              <span className="font-mono">{v11Count}</span>
              <span className="text-muted-foreground">in v1.1</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Mobile: stacked requirement → feature pills */}
        <div className="md:hidden space-y-2.5">
          {REQUIREMENTS.map((req) => {
            const meta = COVERAGE_META[req.coverage];
            const Icon = meta.Icon;
            return (
              <div key={req.code} className="rounded-md border bg-card p-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-primary font-medium">{req.code}</span>
                  <Icon className={cn('h-3.5 w-3.5', meta.iconCls)} />
                  <span className="text-xs flex-1 truncate">{req.title}</span>
                </div>
                <div className="mt-2 pl-1 flex flex-wrap items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  {req.features.map((fid) => {
                    const f = FEATURES.find((x) => x.id === fid);
                    if (!f) return null;
                    return (
                      <Link
                        key={fid}
                        href={f.href}
                        className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] hover:bg-muted"
                      >
                        {f.label}
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: two columns + SVG arrows */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 gap-x-32 text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
            <span>Requirement</span>
            <span>Instrata feature</span>
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
                  id="naica-arrow-covered"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(150 60% 35%)" />
                </marker>
                <marker
                  id="naica-arrow-v11"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(38 90% 50%)" />
                </marker>
              </defs>
              {connections.map((c, i) => {
                const meta = COVERAGE_META[c.coverage];
                const highlighted = isHighlighted(c);
                const dimmed = anyHover && !highlighted;
                return (
                  <path
                    key={`${c.reqCode}-${c.featId}-${i}`}
                    d={c.d}
                    stroke={meta.stroke}
                    strokeWidth={highlighted ? 2.25 : 1.5}
                    strokeOpacity={dimmed ? 0.12 : highlighted ? 1 : 0.5}
                    fill="none"
                    markerEnd={
                      c.coverage === 'covered'
                        ? 'url(#naica-arrow-covered)'
                        : 'url(#naica-arrow-v11)'
                    }
                    className="transition-all duration-150"
                  />
                );
              })}
            </svg>

            {/* LEFT: requirement cards */}
            <div className="col-start-1 space-y-2 relative z-10">
              {REQUIREMENTS.map((req) => {
                const meta = COVERAGE_META[req.coverage];
                const Icon = meta.Icon;
                const active = hoverReq === req.code;
                return (
                  <div
                    key={req.code}
                    ref={(el) => {
                      if (el) reqRefs.current.set(req.code, el);
                      else reqRefs.current.delete(req.code);
                    }}
                    onMouseEnter={() => setHoverReq(req.code)}
                    onMouseLeave={() => setHoverReq(null)}
                    className={cn(
                      'rounded-md border bg-card px-3 py-2 transition-colors cursor-default',
                      active && 'border-primary ring-1 ring-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-primary font-medium shrink-0">
                        {req.code}
                      </span>
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.iconCls)} />
                      <span className="text-xs truncate">{req.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="col-start-2" aria-hidden="true" />

            {/* RIGHT: feature cards */}
            <div className="col-start-3 space-y-2 relative z-10">
              {FEATURES.map((feat) => {
                const active = hoverFeat === feat.id;
                return (
                  <Link
                    key={feat.id}
                    href={feat.href}
                    ref={(el) => {
                      if (el) featRefs.current.set(feat.id, el);
                      else featRefs.current.delete(feat.id);
                    }}
                    onMouseEnter={() => setHoverFeat(feat.id)}
                    onMouseLeave={() => setHoverFeat(null)}
                    className={cn(
                      'block rounded-md border bg-card px-3 py-2 transition-colors hover:bg-muted/40',
                      active && 'border-primary ring-1 ring-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs flex-1 truncate">{feat.label}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-[2px] w-5 rounded-full"
                style={{ backgroundColor: 'hsl(150 60% 35%)' }}
              />
              Covered today
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-[2px] w-5 rounded-full"
                style={{ backgroundColor: 'hsl(38 90% 50%)' }}
              />
              In v1.1
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
