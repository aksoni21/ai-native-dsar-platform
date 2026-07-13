import { StatCard } from '../shared/StatCard';

const STATS = [
  { value: '45 days', caption: 'Typical statutory clock, with hard penalties for missing it.' },
  { value: '6–12', caption: 'Disconnected systems a single record can live across.' },
  { value: '100%', caption: 'Of actions must be defensible and evidenced on audit.' },
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-8 py-[76px]">
      <div className="max-w-[640px]">
        <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
          The problem
        </div>
        <h2 className="mt-3.5 text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground">
          DSAR work is slow because the data is everywhere
        </h2>
        <p className="mt-4 text-[17px] leading-[1.55] text-[hsl(var(--text-body))]">
          Every request means collecting intake details, verifying identity, searching fragmented systems,
          deciding which records actually match, tracking regulatory deadlines, and preserving evidence for
          audit — mostly by hand.
        </p>
      </div>
      <div className="mt-9 grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        {STATS.map((s) => (
          <StatCard key={s.value} value={s.value} caption={s.caption} />
        ))}
      </div>
    </section>
  );
}
