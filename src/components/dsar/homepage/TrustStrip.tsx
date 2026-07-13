const BUILT_FOR = ['CCPA / CPRA', 'GDPR', 'Right to Know', 'Delete My Data', 'Correction', 'Access requests'];

export function TrustStrip() {
  return (
    <section className="mx-auto max-w-[1200px] px-8 pb-1 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-3.5 border-y border-[hsl(var(--line-soft-3))] py-[18px] font-mono text-[12.5px] text-[hsl(var(--text-faint))]">
        <span className="font-semibold text-[hsl(var(--text-secondary))]">Built for:</span>
        {BUILT_FOR.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  );
}
