import { Badge } from '@/components/ui/badge';

interface RequestDetailsCardProps {
  requestId: string;
  consumerName: string;
  consumerEmail: string | null;
  typeLabel: string;
  jurisdictionLabel: string;
  submittedLabel: string;
  identityVerified: boolean;
  slaDaysLeft: number;
  slaTone: 'success' | 'warn' | 'danger';
}

const SLA_VARIANT = { success: 'success', warn: 'warn', danger: 'danger' } as const;

export function RequestDetailsCard({
  requestId,
  consumerName,
  consumerEmail,
  typeLabel,
  jurisdictionLabel,
  submittedLabel,
  identityVerified,
  slaDaysLeft,
  slaTone,
}: RequestDetailsCardProps) {
  const slaLabel = slaDaysLeft < 0 ? `${Math.abs(slaDaysLeft)}d overdue` : `${slaDaysLeft} days left`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-[hsl(var(--line-soft))] px-[18px] py-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[hsl(var(--text-faint))]">{requestId}</span>
          <span className="ml-auto">
            <Badge variant="accent">{typeLabel}</Badge>
          </span>
        </div>
        <div className="mt-3 text-[17px] font-bold text-foreground">{consumerName}</div>
        {consumerEmail && <div className="mt-0.5 text-[13px] text-muted-foreground">{consumerEmail}</div>}
      </div>
      <div className="flex flex-col gap-2.5 px-[18px] py-3.5">
        <Row label="Jurisdiction" value={jurisdictionLabel} />
        <Row label="Submitted" value={submittedLabel} />
        <Row
          label="Identity"
          value={identityVerified ? '✓ Verified' : 'Unverified'}
          valueClassName={identityVerified ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'}
        />
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[hsl(var(--text-faint))]">SLA</span>
          <Badge variant={SLA_VARIANT[slaTone]}>{slaLabel}</Badge>
        </div>
        <Row label="Reviewer" value="You" />
      </div>
    </div>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-[hsl(var(--text-faint))]">{label}</span>
      <span className={`font-semibold text-foreground ${valueClassName ?? ''}`}>{value}</span>
    </div>
  );
}
