import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { SlaIndicator } from '../shared/SlaIndicator';
import type { QueueRow } from './queueData';

const GRID_COLS = '96px 1.6fr 1.1fr 1fr 1.1fr 1.2fr 92px';
const STATUS_VARIANT: Record<QueueRow['bucket'], 'warn' | 'accent' | 'neutral' | 'success'> = {
  approval: 'warn',
  searching: 'accent',
  review: 'neutral',
  completed: 'success',
};

export function RequestTable({ rows }: { rows: QueueRow[] }) {
  return (
    <div className="mt-3.5 overflow-hidden overflow-x-auto rounded-2xl border border-border bg-card">
      <div
        className="grid min-w-[820px] gap-3 border-b border-[hsl(var(--line-soft-3))] bg-[hsl(var(--line-soft-2))] px-[18px] py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[hsl(var(--text-faint))]"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <span>ID</span>
        <span>Consumer</span>
        <span>Type</span>
        <span>Status</span>
        <span>SLA</span>
        <span>Reviewer</span>
        <span />
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid min-w-[820px] items-center gap-3 border-b border-[hsl(var(--line-soft-2))] px-[18px] py-3.5 last:border-b-0 hover:bg-[hsl(var(--line-soft-2))]"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <span className="font-mono text-[12.5px] font-semibold text-foreground">{r.id}</span>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-foreground">{r.name}</div>
            <div className="text-[11.5px] text-[hsl(var(--text-faint))]">
              {r.region} · {r.verify}
            </div>
          </div>
          <span className="justify-self-start">
            <Badge variant="accent">{r.type}</Badge>
          </span>
          <span className="justify-self-start">
            <Badge variant={STATUS_VARIANT[r.bucket]}>{r.status}</Badge>
          </span>
          <SlaIndicator daysLeft={r.slaDays} />
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[10.5px] font-bold text-white"
              style={{ background: r.avatarBg }}
            >
              {r.initials}
            </span>
            <span className="truncate text-[12.5px] text-[hsl(var(--text-secondary))]">{r.reviewer}</span>
          </div>
          <Link
            href="/dsar/demo"
            className="justify-self-end rounded-lg border border-[hsl(var(--input))] px-3 py-1.5 text-[12.5px] font-semibold text-foreground hover:border-foreground"
          >
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}
