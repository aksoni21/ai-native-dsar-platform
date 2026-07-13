interface StatCardProps {
  label?: string;
  value: string;
  valueColor?: string;
  caption?: string;
}

/** White stat tile — covers both Homepage's 3 problem-stat cards (with
 * captions) and Dashboard's 4 queue-stat cards (colored values, no caption). */
export function StatCard({ label, value, valueColor, caption }: StatCardProps) {
  return (
    <div className="rounded-[13px] border border-border bg-card px-[18px] py-4">
      {label && <div className="text-xs font-semibold text-muted-foreground">{label}</div>}
      <div
        className="mt-1.5 font-mono text-[26px] font-extrabold"
        style={{ color: valueColor ?? 'hsl(var(--foreground))' }}
      >
        {value}
      </div>
      {caption && <div className="mt-2 text-sm leading-snug text-muted-foreground">{caption}</div>}
    </div>
  );
}
