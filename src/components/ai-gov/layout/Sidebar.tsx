'use client';

import Link from 'next/link';
import {
  Boxes,
  ShieldCheck,
  FileWarning,
  FileText,
  Users,
  History,
  Network,
  Radar,
  UserCog,
  Code,
  Sparkles,
} from 'lucide-react';
import { DEMO_STEPS } from '@/lib/ai-gov/flow';
import { ROUTE_PREFIX } from '@/lib/ai-gov/constants';
import { useFlowStep } from '@/hooks/ai-gov/useFlowStep';
import modulesRaw from '@/data/ai-gov/modules.json';
import type { ProductModule } from '@/types/ai-gov';
import { cn } from '@/lib/ai-gov/utils';
import { Badge } from '@/components/ai-gov/ui/badge';

const modules = modulesRaw as unknown as ProductModule[];

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Radar,
  dashboard: ShieldCheck,
  inventory: Boxes,
  classification: Network,
  'vendor-vault': FileWarning,
  'pre-decision': FileText,
  'adverse-outcome': FileText,
  'human-review': Users,
  'audit-trail': History,
  'heat-map': Network,
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Boxes,
  'vendor-vault': FileWarning,
  'control-mapping': Network,
  disclosures: FileText,
  'consumer-rights': Users,
  'audit-trail': History,
  'federal-bridges': ShieldCheck,
  'regulatory-watchtower': Radar,
  'human-review': UserCog,
  'developer-module': Code,
};

interface Props {
  onNavigate?: () => void;
  variant?: 'desktop' | 'drawer';
}

export function Sidebar({ onNavigate, variant = 'desktop' }: Props) {
  const { slug } = useFlowStep();

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col bg-card/40',
        variant === 'desktop' && 'hidden lg:flex border-r h-dvh sticky top-0',
        variant === 'drawer' && 'w-full h-full'
      )}
    >
      <div className="px-5 pt-5 pb-4">
        <Link
          href={`${ROUTE_PREFIX}/inbox`}
          onClick={onNavigate}
          className="flex items-center gap-2.5"
        >
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg">Instrata AI</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Governance in Layers
            </div>
          </div>
        </Link>
      </div>

      <div className="px-3">
        <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Walkthrough
        </div>
        <nav className="space-y-0.5">
          {DEMO_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step.slug] ?? ShieldCheck;
            const active = slug === step.slug;
            return (
              <Link
                key={step.slug}
                href={`${ROUTE_PREFIX}/${step.slug}`}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div
                  className={cn(
                    'h-5 w-5 shrink-0 rounded-md grid place-items-center text-[10px] font-mono',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className={cn('truncate', active && 'font-medium')}>{step.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-3 mt-6 pb-6 overflow-y-auto">
        <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Platform
        </div>
        <ul className="space-y-0.5">
          {modules.map((m) => {
            const Icon = MODULE_ICONS[m.id] ?? ShieldCheck;
            const dimmed = m.phase !== 1;
            const isActive = m.shown_in.includes(slug);
            return (
              <li
                key={m.id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1 text-xs',
                  dimmed && 'opacity-50',
                  isActive && 'bg-accent/10'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{m.short}</span>
                {m.phase !== 1 && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">
                    Phase 2
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
