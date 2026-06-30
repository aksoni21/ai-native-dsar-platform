'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ai-gov/ui/button';
import { ROUTE_PREFIX } from '@/lib/ai-gov/constants';
import { useFlowStep } from '@/hooks/ai-gov/useFlowStep';

export function StepFooter() {
  const { prev, next, current, stepIndex, totalSteps } = useFlowStep();
  if (!current) return null;

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 mt-10 flex items-center justify-between gap-3 border-t bg-background/90 backdrop-blur px-4 lg:px-8 py-3">
      <div className="min-w-0">
        {prev ? (
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link href={`${ROUTE_PREFIX}/${prev.slug}`}>
              <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{prev.label}</span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </div>
      <div className="text-[11px] font-mono text-muted-foreground">
        {stepIndex + 1} / {totalSteps}
      </div>
      <div>
        {next ? (
          <Button asChild size="sm">
            <Link href={`${ROUTE_PREFIX}/${next.slug}`}>
              <span className="hidden sm:inline">Next:&nbsp;</span>
              {next.label}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={`${ROUTE_PREFIX}/inbox`}>Restart</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
