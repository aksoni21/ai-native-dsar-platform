'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InboxDrawer } from './InboxDrawer';

const POLL_INTERVAL_MS = 15_000;

/**
 * Floating mailbox button in the demo header. Shows an unread-count badge
 * for pending Izzy replies. Clicking opens the InboxDrawer.
 */
export function InboxButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch('/api/operator-inbox', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { threads?: Array<{ outbound: unknown | null }> };
      const pending = (data.threads ?? []).filter((t) => !t.outbound).length;
      setPendingCount(pending);
    } catch {
      // Silent — the badge is best-effort.
    }
  }, []);

  // Poll the count in the background even when the drawer is closed.
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('relative gap-1.5', className)}
        aria-label="Open Izzy's operator inbox"
        title="Izzy's operator inbox — async email loop"
      >
        <Inbox className="h-4 w-4" />
        <span className="hidden sm:inline text-xs font-medium">Inbox</span>
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </Button>
      <InboxDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
