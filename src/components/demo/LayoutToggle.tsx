'use client';

import { useDemoContext } from '@/context/DemoContext';
import type { LayoutMode } from '@/types';
import { cn } from '@/lib/utils';
import { LayoutPanelLeft, PanelRight, Maximize2 } from 'lucide-react';

const MODES: { mode: LayoutMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'split', label: 'Split', icon: <LayoutPanelLeft className="h-3.5 w-3.5" /> },
  { mode: 'full-ui', label: 'Full UI', icon: <Maximize2 className="h-3.5 w-3.5" /> },
  { mode: 'full-copilot', label: 'Izzy', icon: <PanelRight className="h-3.5 w-3.5" /> },
];

export function LayoutToggle() {
  const { layoutMode, setLayoutMode } = useDemoContext();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
      {MODES.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => setLayoutMode(mode)}
          title={`${label} layout`}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            layoutMode === mode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
