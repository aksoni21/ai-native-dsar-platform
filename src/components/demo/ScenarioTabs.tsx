'use client';

import { useRef, useState } from 'react';
import { ListFilter, ChevronDown } from 'lucide-react';
import { useDemoContext, LIVE_SCENARIO_ID } from '@/context/DemoContext';
import { SCENARIOS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { RequestPicker } from './RequestPicker';

const STATUS_DOT: Record<number, string> = {
  1: 'bg-[hsl(var(--success))]',
  2: 'bg-[hsl(var(--info))]',
  3: 'bg-violet-500',
  4: 'bg-[hsl(var(--warning))]',
  5: 'bg-emerald-500',
  6: 'bg-muted-foreground',
  7: 'bg-amber-500',
  8: 'bg-sky-500',
};

export function ScenarioTabs() {
  const { activeScenario, setActiveScenario } = useDemoContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);

  const isLiveActive = activeScenario.id === LIVE_SCENARIO_ID;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 overflow-x-auto -mx-1 px-1"
        role="tablist"
        aria-label="Demo scenarios"
      >
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenario.id === scenario.id;
          return (
            <button
              key={scenario.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveScenario(scenario.id)}
              title={`${scenario.label} — press ${scenario.id}`}
              className={cn(
                'group relative flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-opacity',
                  STATUS_DOT[scenario.id],
                  isActive ? 'opacity-100' : 'opacity-70'
                )}
                aria-hidden
              />
              {isActive && (
                <span
                  className="font-mono text-[10px] tabular-nums text-primary-foreground/70"
                  aria-hidden
                >
                  {scenario.id}
                </span>
              )}
              <span>{scenario.label}</span>
            </button>
          );
        })}

        {/* 7th tab — request picker */}
        <button
          ref={pickerTriggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((o) => !o)}
          title="Pick any request from the database"
          className={cn(
            'group relative ml-1 flex flex-shrink-0 items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            isLiveActive
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <ListFilter className="h-3 w-3" aria-hidden />
          {isLiveActive ? (
            <>
              <span className="font-mono text-[10px] tabular-nums opacity-70">7</span>
              <span className="font-mono text-[11px]">{activeScenario.requestId}</span>
            </>
          ) : (
            <span>Pick a request…</span>
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              pickerOpen && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </div>

      {pickerOpen && (
        <RequestPicker
          anchorRef={pickerTriggerRef}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
