interface Source {
  name: string;
  count: number;
  ok: boolean;
}

export function ConnectedSourcesCard({ sources }: { sources: Source[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-[18px] py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--text-faint))]">
        Connected sources
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {sources.map((s) => (
          <div
            key={s.name}
            className={`flex items-center gap-2.5 text-[13px] ${s.ok ? '' : 'text-muted-foreground'}`}
          >
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: s.ok ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}
            />
            {s.name}
            <span
              className="ml-auto font-mono text-[11px]"
              style={{ color: s.ok ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}
            >
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
