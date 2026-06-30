'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DedupStatusChipProps {
  duplicateOfId: string | null;
  consumerEmail: string | null;
  consumerPhone: string | null;
}

export default function DedupStatusChip({
  duplicateOfId,
  consumerEmail,
  consumerPhone,
}: DedupStatusChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const isDupe = !!duplicateOfId;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          isDupe
            ? `Possible duplicate of ${duplicateOfId}, click for details`
            : 'No duplicates found, click for details'
        }
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isDupe
            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900'
            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900',
        )}
      >
        {isDupe ? (
          <AlertTriangle className="h-3 w-3" aria-hidden />
        ) : (
          <Check className="h-3 w-3" aria-hidden />
        )}
        <span className="whitespace-nowrap">
          {isDupe ? `Possible duplicate · ${duplicateOfId}` : 'No duplicates'}
        </span>
        <ChevronDown
          className={cn('h-2.5 w-2.5 opacity-60 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Dedup check details"
          className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Dedup check
            </span>
            <span className="text-[10px] text-muted-foreground/70">step 1 of 11</span>
          </div>

          {isDupe ? (
            <div className="space-y-2 text-[12px] leading-snug">
              <p className="text-foreground">
                Matched on email + phone with{' '}
                <Link
                  href={`/requests/${duplicateOfId}`}
                  className="font-semibold underline underline-offset-2 hover:text-primary"
                >
                  {duplicateOfId}
                </Link>
                .
              </p>
              <p className="text-muted-foreground">
                Reviewer should confirm before disposition runs. The earlier request remains the canonical thread; this one closes as a dupe to avoid duplicate notifications and audit-trail noise.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-[12px] leading-snug">
              <p className="text-foreground">
                Cross-checked every other intake on file by email + phone — <strong>0 matches</strong>.
              </p>
              <p className="text-muted-foreground">
                Probed by:
              </p>
              <ul className="ml-1 space-y-1 text-muted-foreground">
                {consumerEmail && (
                  <li className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">email</span>
                    <code className="rounded bg-muted px-1 py-px text-[11px] text-foreground">
                      {consumerEmail}
                    </code>
                  </li>
                )}
                {consumerPhone && (
                  <li className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">phone</span>
                    <code className="rounded bg-muted px-1 py-px text-[11px] text-foreground">
                      {consumerPhone}
                    </code>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
