import { AuditRow, type AuditRowData } from '../shared/AuditRow';

export function AuditTrailCard({ rows }: { rows: AuditRowData[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--line-soft))] px-4 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--text-faint))]">
          Audit trail
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-[hsl(var(--text-faint))]">immutable</span>
      </div>
      <div className="py-1.5">
        {rows.map((row, i) => (
          <AuditRow key={i} {...row} animate />
        ))}
      </div>
    </div>
  );
}
