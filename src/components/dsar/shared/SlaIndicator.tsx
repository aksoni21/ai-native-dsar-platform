/** Colored dot + "Nd left" text, threshold-driven per the Dashboard spec:
 * <=7 danger, <=20 warn, else neutral-green-dot with plain text (not colored). */
export function SlaIndicator({ daysLeft }: { daysLeft: number }) {
  const dot =
    daysLeft <= 7
      ? 'hsl(var(--destructive))'
      : daysLeft <= 20
        ? 'hsl(var(--warning))'
        : 'hsl(var(--success))';
  const text =
    daysLeft <= 7
      ? 'hsl(var(--destructive))'
      : daysLeft <= 20
        ? 'hsl(var(--warning))'
        : 'hsl(var(--text-secondary))';

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 flex-none rounded-full" style={{ background: dot }} />
      <span className="text-[12.5px] font-semibold" style={{ color: text }}>
        {daysLeft}d left
      </span>
    </div>
  );
}
