'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  BarChart3,
  Brain,
  Key,
  Scale,
  ClipboardList,
  FileCheck,
  UserCheck,
  Clock,
  MessageSquare,
  Play,
  RotateCcw,
  Loader2,
  Check,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Car,
  CalendarSearch,
  AlertTriangle,
  Mail,
  MailOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STAGE_VIEWS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StageViewId } from '@/types';
import type { StepStatus } from '@/hooks/usePipelineAnimation';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  BarChart3,
  Brain,
  Key,
  Scale,
  ClipboardList,
  FileCheck,
  UserCheck,
  Clock,
  MessageSquare,
  Car,
  CalendarSearch,
  AlertTriangle,
  Mail,
  MailOpen,
};

const WIDTH_KEY = 'naica-rail-width';
const MIN_WIDTH = 52;
const MAX_WIDTH = 280;
const DEFAULT_WIDTH = 200;
/** Below this width, the rail renders in icon-only mode. */
const ICON_THRESHOLD = 96;

export type RailViewStatus = StepStatus | 'always' | 'unavailable';

interface PipelineRailProps {
  focusedView: StageViewId;
  onSelectView: (id: StageViewId) => void;
  /** Map of view id → status. Pipeline-bound views reflect the run; non-pipeline views use 'always' or 'unavailable'. */
  viewStatuses: Record<StageViewId, RailViewStatus>;
  /** Whether each view is reachable (has data to show) — unavailable views are dimmed and unclickable. */
  viewAvailable: Record<StageViewId, boolean>;
  isRunning: boolean;
  hasRun: boolean;
  onRun: () => void;
  onReset: () => void;
}

export default function PipelineRail({
  focusedView,
  onSelectView,
  viewStatuses,
  viewAvailable,
  isRunning,
  hasRun,
  onRun,
  onReset,
}: PipelineRailProps) {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  // The width to restore to when "expand" is clicked from a collapsed state.
  const lastExpandedRef = useRef<number>(DEFAULT_WIDTH);

  // Hydrate persisted width on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WIDTH_KEY);
      if (saved) {
        const n = parseInt(saved, 10);
        if (!Number.isNaN(n)) {
          const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
          setWidth(clamped);
          if (clamped >= ICON_THRESHOLD) lastExpandedRef.current = clamped;
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (w: number) => {
    try {
      window.localStorage.setItem(WIDTH_KEY, String(w));
    } catch {
      /* ignore */
    }
  };

  const collapsed = width < ICON_THRESHOLD;

  // Drag-to-resize.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setResizing(true);
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    // Read current rail width from the parent <aside> so we don't depend on stale state.
    const aside = handle.parentElement as HTMLElement | null;
    const startWidth = aside?.getBoundingClientRect().width ?? DEFAULT_WIDTH;

    const onMove = (ev: PointerEvent) => {
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (ev.clientX - startX)));
      setWidth(next);
      if (next >= ICON_THRESHOLD) lastExpandedRef.current = next;
    };
    const onUp = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setResizing(false);
      const finalWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (ev.clientX - startX)));
      persist(finalWidth);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  // Quick-snap toggle: collapse to MIN_WIDTH or restore to last expanded width.
  const toggleCollapse = () => {
    const next = collapsed ? lastExpandedRef.current : MIN_WIDTH;
    setWidth(next);
    persist(next);
  };

  return (
    <aside
      className={cn(
        'relative flex flex-shrink-0 flex-col gap-3 border-r border-border bg-muted/30 py-3',
        // No transition while resizing — would lag behind the pointer.
        !resizing && 'transition-[width] duration-200',
        collapsed ? 'px-1.5' : 'px-3',
      )}
      style={{ width: `${width}px` }}
      aria-label="Pipeline stages"
    >
      {/* Header row — STAGES label (when expanded) + collapse toggle */}
      <button
        type="button"
        onClick={toggleCollapse}
        className={cn(
          'group flex h-7 items-center rounded-md text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground',
          collapsed ? 'w-full justify-center' : 'w-full justify-between px-1',
        )}
        title={collapsed ? 'Expand stages' : 'Collapse stages'}
        aria-label={collapsed ? 'Expand stages' : 'Collapse stages'}
        aria-expanded={!collapsed}
      >
        {!collapsed && <span>Stages</span>}
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Run / Reset / Re-run controls */}
      <div className="flex flex-col gap-1.5">
        {!isRunning && !hasRun && (
          <Button
            onClick={onRun}
            size="sm"
            className={cn('w-full gap-1.5', collapsed ? 'justify-center px-0' : 'justify-start')}
            title="Run pipeline"
            aria-label="Run pipeline"
          >
            <Play className="h-3.5 w-3.5" />
            {!collapsed && 'Run Pipeline'}
          </Button>
        )}
        {!isRunning && hasRun && (
          <>
            <Button
              onClick={onRun}
              size="sm"
              className={cn('w-full gap-1.5', collapsed ? 'justify-center px-0' : 'justify-start')}
              title="Re-run pipeline"
              aria-label="Re-run pipeline"
            >
              <Play className="h-3.5 w-3.5" />
              {!collapsed && 'Re-run'}
            </Button>
            <Button
              onClick={onReset}
              size="sm"
              variant="outline"
              className={cn('w-full gap-1.5', collapsed ? 'justify-center px-0' : 'justify-start')}
              title="Reset pipeline"
              aria-label="Reset pipeline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {!collapsed && 'Reset'}
            </Button>
          </>
        )}
        {isRunning && (
          <Button
            size="sm"
            variant="outline"
            disabled
            className={cn('w-full gap-1.5', collapsed ? 'justify-center px-0' : 'justify-start')}
            aria-label="Pipeline running"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {!collapsed && 'Running…'}
          </Button>
        )}
      </div>

      <nav className="flex flex-col gap-0.5" role="list">
        {STAGE_VIEWS.map((view) => {
          const status = viewStatuses[view.id];
          const isAvailable = viewAvailable[view.id];
          const isActive = focusedView === view.id;
          const Icon = ICON_MAP[view.icon] ?? Search;

          // The two Communications Coordinator stages share a single rail
          // slot — only one is `viewAvailable` per scenario. Hide the
          // unavailable twin entirely so the rail doesn't show a dimmed
          // duplicate. Other stages keep their existing "(n/a)" affordance.
          const hideWhenUnavailable =
            view.id === 'coordinator_outreach' || view.id === 'coordinator_reply';
          if (hideWhenUnavailable && !isAvailable) return null;

          return (
            <button
              key={view.id}
              type="button"
              role="listitem"
              onClick={() => isAvailable && onSelectView(view.id)}
              disabled={!isAvailable}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'group flex items-center rounded-md text-left text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                collapsed ? 'relative h-7 w-full justify-center px-0' : 'gap-2 px-2 py-1.5',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isAvailable
                    ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/40',
              )}
              title={
                collapsed
                  ? view.label + (!isAvailable ? ' — not applicable' : '')
                  : !isAvailable
                    ? `${view.label} — not applicable to this scenario`
                    : view.label
              }
            >
              {!collapsed && <StatusDot status={status} active={isActive} />}
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {!collapsed && (
                <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="truncate">{view.label}</span>
                  {!isAvailable && (
                    <span
                      className={cn(
                        'flex-shrink-0 text-[10px] font-normal lowercase tracking-tight',
                        isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/50',
                      )}
                      aria-label="not applicable to this scenario"
                    >
                      (n/a)
                    </span>
                  )}
                </span>
              )}
              {collapsed && <CollapsedStatusOverlay status={status} active={isActive} />}
            </button>
          );
        })}
      </nav>

      {/* Drag handle — wider hit area than visible cue. The vertical edge-line
         is always visible so the boundary reads cleanly; the centered dot
         column makes the resize affordance obvious. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize stages panel"
        onPointerDown={onPointerDown}
        onDoubleClick={() => {
          setWidth(DEFAULT_WIDTH);
          lastExpandedRef.current = DEFAULT_WIDTH;
          persist(DEFAULT_WIDTH);
        }}
        className={cn(
          'group absolute right-0 top-0 z-10 flex h-full w-4 -mr-2 cursor-col-resize select-none items-center justify-center',
          // Edge line — sits flush on the rail border. Always faintly visible,
          // primary on hover/drag.
          'after:absolute after:inset-y-0 after:right-2 after:w-px after:bg-border after:transition-colors',
          'hover:after:bg-primary/70',
          resizing && 'after:bg-primary',
        )}
        title="Drag to resize · double-click to reset"
      >
        {/* Centered rectangle grip — always visible, brightens on hover. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none block h-[30px] w-2 rounded-full transition-colors',
            resizing ? 'bg-primary' : 'bg-muted-foreground/40 group-hover:bg-primary/80',
          )}
        />
      </div>
    </aside>
  );
}

function StatusDot({ status, active }: { status: RailViewStatus; active: boolean }) {
  if (active) {
    return (
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-foreground/80"
        aria-hidden
      />
    );
  }
  if (status === 'completed' || status === 'always') {
    return (
      <Check
        className="h-3 w-3 flex-shrink-0 text-[hsl(var(--success))]"
        aria-label="completed"
      />
    );
  }
  if (status === 'running') {
    return (
      <Loader2
        className="h-3 w-3 flex-shrink-0 animate-spin text-[hsl(var(--info))]"
        aria-label="running"
      />
    );
  }
  if (status === 'unavailable') {
    return (
      <Lock className="h-3 w-3 flex-shrink-0 text-muted-foreground/30" aria-label="unavailable" />
    );
  }
  return (
    <span
      className="h-1.5 w-1.5 flex-shrink-0 rounded-full border border-muted-foreground/40"
      aria-label="pending"
    />
  );
}

function CollapsedStatusOverlay({ status, active }: { status: RailViewStatus; active: boolean }) {
  if (active) return null;
  if (status === 'running') {
    return (
      <span
        className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--info))] animate-pulse"
        aria-hidden
      />
    );
  }
  if (status === 'completed' || status === 'always') {
    return (
      <span
        className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]"
        aria-hidden
      />
    );
  }
  return null;
}
