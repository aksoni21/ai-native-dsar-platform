'use client';

import { Sparkles, Database } from 'lucide-react';
import { cn } from '@/lib/ai-gov/utils';

interface Props {
  fallback: boolean;
  className?: string;
}

export function HeroClaudeIndicator({ fallback, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider',
        fallback
          ? 'border-muted-foreground/30 text-muted-foreground'
          : 'border-accent/60 bg-accent/10 text-accent-foreground',
        className
      )}
      title={
        fallback
          ? 'No configured AI provider key set — showing cached response'
          : 'Generated live by the configured AI model'
      }
    >
      {fallback ? (
        <>
          <Database className="h-2.5 w-2.5" />
          Demo cache
        </>
      ) : (
        <>
          <Sparkles className="h-2.5 w-2.5" />
          Live AI
        </>
      )}
    </span>
  );
}
