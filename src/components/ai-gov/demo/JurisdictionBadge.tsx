import type { JurisdictionRule } from '@/types/ai-gov';
import { JURISDICTION_SHORT, STATUS_LABEL } from '@/lib/ai-gov/constants';
import { cn } from '@/lib/ai-gov/utils';

const STATUS_CLS: Record<string, string> = {
  covered: 'bg-destructive/10 text-destructive border-destructive/30',
  in_scope: 'bg-warning/10 text-warning-foreground border-warning/40',
  exempt: 'bg-success/10 text-success border-success/30',
  edge: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

interface Props {
  rule: JurisdictionRule;
  compact?: boolean;
}

export function JurisdictionBadge({ rule, compact }: Props) {
  const cls = STATUS_CLS[rule.status] ?? STATUS_CLS.edge;
  return (
    <div
      className={cn(
        'inline-flex flex-col rounded-md border px-2.5 py-1.5 text-xs',
        cls,
        compact && 'px-2 py-1'
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-semibold">{JURISDICTION_SHORT[rule.state]}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-90">
          {STATUS_LABEL[rule.status]}
        </span>
      </div>
      {!compact && (
        <div className="text-[10px] mt-0.5 opacity-80">
          confidence {Math.round(rule.confidence * 100)}%
        </div>
      )}
    </div>
  );
}
