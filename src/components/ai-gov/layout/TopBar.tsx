'use client';

import { Moon, Sun, Briefcase, Landmark, Car, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { useFlowStep } from '@/hooks/ai-gov/useFlowStep';
import { Button } from '@/components/ai-gov/ui/button';
import { cn } from '@/lib/ai-gov/utils';

interface Props {
  onOpenMobileNav?: () => void;
}

export function TopBar({ onOpenMobileNav }: Props) {
  const { vertical, setVertical, hydrated } = useVertical();
  const { current, stepIndex, totalSteps } = useFlowStep();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 backdrop-blur px-3 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden -ml-1"
        onClick={onOpenMobileNav}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        {current && (
          <>
            <span className="font-mono text-[11px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
              {stepIndex + 1}/{totalSteps}
            </span>
            <span className="text-sm truncate">{current.label}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
          <ToggleBtn
            active={vertical === 'automotive'}
            onClick={() => setVertical('automotive')}
            disabled={!hydrated}
            label="Auto"
            Icon={Car}
          />
          <ToggleBtn
            active={vertical === 'hr'}
            onClick={() => setVertical('hr')}
            disabled={!hydrated}
            label="HR"
            Icon={Briefcase}
          />
          <ToggleBtn
            active={vertical === 'lending'}
            onClick={() => setVertical('lending')}
            disabled={!hydrated}
            label="Lending"
            Icon={Landmark}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
      </div>
    </header>
  );
}

function ToggleBtn({
  active,
  onClick,
  disabled,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-sm px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-background shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
