export const FILTERS = ['All', 'Awaiting approval', 'Agent searching', 'In review', 'Completed'] as const;
export type FilterValue = (typeof FILTERS)[number];

interface FilterBarProps {
  active: FilterValue;
  onChange: (f: FilterValue) => void;
  countLabel: string;
}

export function FilterBar({ active, onChange, countLabel }: FilterBarProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => {
        const isActive = f === active;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className="rounded-[9px] border px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-foreground"
            style={{
              borderColor: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
              background: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
              color: isActive ? '#fff' : 'hsl(var(--text-secondary))',
            }}
          >
            {f}
          </button>
        );
      })}
      <div className="ml-auto font-mono text-[13px] text-[hsl(var(--text-faint))]">{countLabel}</div>
    </div>
  );
}
