'use client';

import { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionConfirmModalProps {
  open: boolean;
  actionText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionConfirmModal({
  open,
  actionText,
  onConfirm,
  onCancel,
}: ActionConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc to dismiss
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  // Focus the confirm button when opened (lets the user just hit Enter)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-confirm]')?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-confirm-title"
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-background shadow-xl',
          'mx-4',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 id="action-confirm-title" className="text-sm font-semibold leading-tight">
                Confirm action
              </h2>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Human-approval gate
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Proposed action
          </p>
          <blockquote className="border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm text-foreground">
            {actionText}
          </blockquote>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Confirming routes this to the post-approval execution pipeline. The agent never
            executes write actions directly — write operations live outside the MCP layer and
            only fire after a human approves here.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-confirm
            onClick={onConfirm}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            Confirm and dispatch
          </button>
        </div>
      </div>
    </div>
  );
}
