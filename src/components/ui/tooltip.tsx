'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  className?: string;
}

function Tooltip({ children, className }: TooltipProps) {
  return (
    <div className={cn('relative inline-flex group', className)}>
      {children}
    </div>
  );
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {}

function TooltipTrigger({ className, children, ...props }: TooltipTriggerProps) {
  return (
    <div className={cn('cursor-pointer', className)} {...props}>
      {children}
    </div>
  );
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
}

function TooltipContent({
  className,
  children,
  side = 'top',
  ...props
}: TooltipContentProps) {
  const sideClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn(
        'absolute z-50 hidden group-hover:block rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        sideClasses[side],
        className
      )}
      role="tooltip"
      {...props}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };
