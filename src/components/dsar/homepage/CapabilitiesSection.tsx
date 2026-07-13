const CAPABILITIES = [
  { n: '01', title: 'DSAR intake portal', desc: 'Branded consumer-facing form that captures request type, identity, and jurisdiction.' },
  { n: '02', title: 'Operator request dashboard', desc: 'A queue with status, SLA clock, type, reviewer, and verification at a glance.' },
  { n: '03', title: 'Source-system search', desc: 'Governed queries across connected billing, CRM, support, and marketing systems.' },
  { n: '04', title: 'Agent tool-call visibility', desc: 'Every tool the agent calls is shown inline and written to the log.' },
  { n: '05', title: 'Match reasoning', desc: 'Plain-language explanation of why each record matched — and confidence.' },
  { n: '06', title: 'Audit trail & evidence log', desc: 'Immutable record of inputs, calls, results, and human decisions.' },
  { n: '07', title: 'SLA & status tracking', desc: 'Deadline clocks and status transitions on every request.' },
  { n: '08', title: 'Approval-gated actions', desc: 'Exports, emails, and deletions require explicit human sign-off.' },
  { n: '09', title: 'Human-in-the-loop controls', desc: 'Operators can edit, reject, or request changes to any proposed action.' },
  { n: '10', title: 'Open-source architecture', desc: 'Inspect the orchestration, audit the tools, add your own connectors.' },
];

export function CapabilitiesSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-8 py-20">
      <div className="max-w-[620px]">
        <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
          Capabilities
        </div>
        <h2 className="mt-3.5 text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground">
          Everything a DSAR needs, in one governed workspace
        </h2>
      </div>
      <div className="mt-9 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2">
        {CAPABILITIES.map((cap, i) => (
          <div
            key={cap.n}
            className={`flex gap-3.5 border-[hsl(var(--line-soft-3))] p-6 ${
              i % 2 === 0 ? 'sm:border-r' : ''
            } ${i < CAPABILITIES.length - 2 ? 'border-b' : ''}`}
          >
            <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[hsl(var(--accent-tint))] font-mono text-xs font-semibold text-primary">
              {cap.n}
            </span>
            <div>
              <div className="text-[15.5px] font-bold text-foreground">{cap.title}</div>
              <div className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{cap.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
