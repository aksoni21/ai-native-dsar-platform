interface Step {
  n: string;
  role: string;
  title: string;
  body: string;
  tone: 'dark' | 'accent' | 'final';
}

const STEPS: Step[] = [
  { n: '1', role: 'Consumer', tone: 'dark', title: 'Request is submitted', body: 'A consumer files a privacy request through the intake portal — request type, identity, jurisdiction.' },
  { n: '2', role: 'Operator', tone: 'dark', title: 'Lands in the dashboard', body: 'It enters the operator queue with status, SLA clock, type, and a verification check.' },
  { n: '3', role: 'Agent', tone: 'accent', title: 'Agent searches sources', body: 'Governed tool calls query connected systems. Every call is visible and logged.' },
  { n: '4', role: 'Agent', tone: 'accent', title: 'Explains match reasoning', body: "The agent shows why each record matched — and flags the ones it isn't sure about." },
  { n: '5', role: 'System', tone: 'dark', title: 'Evidence is captured', body: 'Inputs, tool calls, results, and decisions are written to an immutable audit trail.' },
  { n: '6', role: 'Human gate', tone: 'final', title: 'A human approves', body: 'Emails, exports, and deletions happen only after an operator approves the proposed action.' },
];

function StepCard({ step }: { step: Step }) {
  if (step.tone === 'final') {
    return (
      <div className="rounded-2xl border border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[hsl(var(--success))] font-mono text-[13px] text-white">
            {step.n}
          </span>
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[hsl(var(--success-on-dark))]">
            {step.role}
          </div>
        </div>
        <div className="mt-3.5 text-[16.5px] font-bold text-white">{step.title}</div>
        <div className="mt-1.5 text-sm leading-relaxed text-[#A9AFBE]">{step.body}</div>
      </div>
    );
  }
  const badgeBg = step.tone === 'accent' ? 'bg-primary' : 'bg-[hsl(var(--foreground))]';
  const roleColor = step.tone === 'accent' ? 'text-[hsl(var(--accent-foreground))]' : 'text-muted-foreground';
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg font-mono text-[13px] text-white ${badgeBg}`}>
          {step.n}
        </span>
        <div className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${roleColor}`}>{step.role}</div>
      </div>
      <div className="mt-3.5 text-[16.5px] font-bold text-foreground">{step.title}</div>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</div>
    </div>
  );
}

export function ProductWalkthrough() {
  return (
    <section id="product" className="border-y border-[hsl(var(--line-soft-3))] bg-secondary">
      <div className="mx-auto max-w-[1200px] px-8 py-20">
        <div className="max-w-[620px]">
          <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
            How it works
          </div>
          <h2 className="mt-3.5 text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground">
            From consumer request to approved action
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-[hsl(var(--text-body))]">
            The agent does the searching and reasoning. A human always makes the call before anything leaves
            the building.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <StepCard key={step.n} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
