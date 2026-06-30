'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CoordinatorClassification } from '@/types';

const CLASS_STYLE: Record<CoordinatorClassification, string> = {
  provides_new_identity_info:
    'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/60',
  provides_attribution_candidate:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60',
  provides_redirect:
    'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200/60 dark:border-orange-900/60',
  requests_clarification_needed:
    'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300 border-fuchsia-200/60 dark:border-fuchsia-900/60',
  requests_status:
    'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200/60 dark:border-sky-900/60',
  accepts_response:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60',
  disputes_response:
    'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/60',
  requests_extension:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200/60 dark:border-yellow-900/60',
  withdraws_request:
    'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300 border-stone-200/60 dark:border-stone-800/60',
  unrelated_message:
    'bg-muted text-muted-foreground border-border',
};

const CLASS_LABEL: Record<CoordinatorClassification, string> = {
  provides_new_identity_info: 'Provides new identity info',
  provides_attribution_candidate: 'Provides attribution candidate',
  provides_redirect: 'Provides redirect',
  requests_clarification_needed: 'Ambiguous — needs clarification',
  requests_status: 'Requests status',
  accepts_response: 'Accepts response',
  disputes_response: 'Disputes response',
  requests_extension: 'Requests extension',
  withdraws_request: 'Withdraws request',
  unrelated_message: 'Unrelated',
};

export function CoordinatorClassificationBadge({
  classification,
  confidence,
  className,
}: {
  classification: CoordinatorClassification;
  confidence?: number;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', CLASS_STYLE[classification], className)}
    >
      {CLASS_LABEL[classification]}
      {typeof confidence === 'number' && (
        <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-80">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </Badge>
  );
}
