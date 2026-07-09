'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDemoContext } from '@/context/DemoContext';
import { LayoutToggle } from './LayoutToggle';
import { InboxButton } from '@/components/operator-inbox/InboxButton';
import { ThemeToggle } from './ThemeToggle';
import { WorkflowPane } from './WorkflowPane';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { TourOverlay } from '@/components/onboarding/TourOverlay';
import { Bot, LayoutPanelLeft, X, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, daysUntil } from '@/lib/utils';
import { SCENARIOS } from '@/lib/constants';
import { useLiveRequest } from '@/hooks/useLiveRequest';

export function DemoLayout() {
  const { activeScenario, layoutMode, setLayoutMode, setActiveScenario, theme } = useDemoContext();
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false);

  const leftCollapsed = layoutMode === 'full-copilot';
  const rightCollapsed = layoutMode === 'full-ui';

  // lg+ flex sizing per mode. Mobile is handled separately (left full-width, right is drawer).
  // Use explicit `flex-[grow_shrink_basis]` to avoid Tailwind shorthand conflicts.
  const leftLg =
    layoutMode === 'split'
      ? 'lg:flex-[65_65_0%]'
      : layoutMode === 'full-ui'
      ? 'lg:flex-[1_1_0%]'
      : 'lg:flex-none lg:w-12';

  const rightLg =
    layoutMode === 'split'
      ? 'lg:flex-[35_35_0%]'
      : layoutMode === 'full-copilot'
      ? 'lg:flex-[1_1_0%]'
      : 'lg:flex-none lg:w-12';

  // Keyboard shortcuts: 1-5 jump scenarios, Esc closes mobile drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape' && mobileCopilotOpen) {
        setMobileCopilotOpen(false);
        return;
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= SCENARIOS.length) {
        setActiveScenario(SCENARIOS[n - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveScenario, mobileCopilotOpen]);

  return (
    <div
      className={cn(
        'flex h-dvh flex-col bg-background text-foreground overflow-hidden transition-colors',
        theme === 'dark' && 'dark',
      )}
    >
      <ContextualHeader />

      {/* Two-pane body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — workflow. Mobile: full-width. lg+: sized by layout mode. */}
        <div
          data-tour="workflow-pane"
          className={cn(
            'relative flex-1 border-r border-border transition-[flex-basis,width] duration-300 overflow-hidden',
            leftLg
          )}
        >
          {leftCollapsed ? (
            <CollapsedRail
              icon={<LayoutPanelLeft className="h-4 w-4" />}
              label="Workflow"
              direction="right"
              onClick={() => setLayoutMode('split')}
            />
          ) : (
            <WorkflowPane />
          )}
        </div>

        {/* Right pane — co-pilot (lg+ only; below lg, becomes drawer) */}
        <div
          data-tour="agent-pane"
          className={cn(
            'relative hidden lg:block transition-[flex-basis,width] duration-300 overflow-hidden',
            rightLg
          )}
        >
          {rightCollapsed ? (
            <CollapsedRail
              icon={<Bot className="h-4 w-4" />}
              label="Izzy"
              direction="left"
              onClick={() => setLayoutMode('split')}
            />
          ) : (
            <AgentPanel />
          )}
        </div>
      </div>

      <TourOverlay />

      {/* Mobile / tablet floating co-pilot button */}
      <button
        onClick={() => setMobileCopilotOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Open Izzy"
      >
        <MessageSquare className="h-4 w-4" />
        Ask Izzy
      </button>

      {/* Mobile / tablet drawer */}
      {mobileCopilotOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            aria-label="Close Izzy"
            onClick={() => setMobileCopilotOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-enter"
          />
          <div className="absolute right-0 top-0 h-dvh w-full max-w-md bg-background shadow-2xl drawer-enter flex flex-col">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Izzy</span>
              <button
                onClick={() => setMobileCopilotOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContextualHeader() {
  const { activeScenario, theme, setTheme } = useDemoContext();
  const { request } = useLiveRequest(activeScenario.requestId);

  const days = request ? daysUntil(request.deadline_at) : null;
  const slaTone =
    days === null
      ? 'muted'
      : days < 0
      ? 'danger'
      : days <= 7
      ? 'warning'
      : 'success';

  const slaLabel =
    days === null ? '—' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d to SLA`;

  const slaClass: Record<string, string> = {
    danger: 'bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
    success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 py-2 sm:px-4 z-10">
      {/* Brand — links to the team address book */}
      <Link
        href="/"
        className="group flex flex-shrink-0 items-center gap-1.5 rounded-md outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Go to Instrata home"
        title="Instrata home"
      >
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary-foreground">N</span>
        </div>
        <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">instrata</span>
      </Link>

      {/* Right side: SLA pill + theme toggle + layout toggle */}
      <div data-tour="header-controls" className="flex flex-shrink-0 items-center gap-2">
        <Link
          href="/demo/requests"
          className="hidden rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          All requests
        </Link>
        <Link
          href="/platform"
          className="hidden rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          AI-native platform
        </Link>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
            slaClass[slaTone]
          )}
          title={request ? `Deadline: ${new Date(request.deadline_at).toLocaleDateString()}` : ''}
        >
          {slaLabel}
        </span>
        <InboxButton />
        <ThemeToggle theme={theme} onChange={setTheme} />
        <div className="hidden lg:block">
          <LayoutToggle />
        </div>
      </div>
    </header>
  );
}

function CollapsedRail({
  icon,
  label,
  direction,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  direction: 'left' | 'right';
  onClick: () => void;
}) {
  const Chevron = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      className="group flex h-full w-full flex-col items-center gap-3 bg-muted/40 hover:bg-muted py-3 transition-colors border-0"
      title={`Expand ${label}`}
      aria-label={`Expand ${label} pane`}
    >
      <Chevron className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      <div className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</div>
      <span
        className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
    </button>
  );
}
