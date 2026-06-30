'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Theme } from '@/context/DemoContext';

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-background p-0.5"
      role="group"
      aria-label="Color theme"
    >
      <ThemeButton
        active={theme === 'light'}
        onClick={() => onChange('light')}
        label="Light mode"
      >
        <Sun className="h-3.5 w-3.5" />
      </ThemeButton>
      <ThemeButton
        active={theme === 'dark'}
        onClick={() => onChange('dark')}
        label="Dark mode"
      >
        <Moon className="h-3.5 w-3.5" />
      </ThemeButton>
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
