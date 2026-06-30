"use client";

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DuplicateAlertProps {
  duplicateOfId: string;
}

export default function DuplicateAlert({ duplicateOfId }: DuplicateAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950"
      data-tour="duplicate-alert"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          This request is a duplicate of{' '}
          <Link
            href={`/requests/${duplicateOfId}`}
            className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
          >
            {duplicateOfId}
          </Link>
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
