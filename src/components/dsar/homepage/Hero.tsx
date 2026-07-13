import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const AGENT_ACTIVITY = [
  {
    icon: '›',
    text: (
      <>
        <span className="font-mono text-[hsl(var(--accent-foreground))]">search()</span> across 4 source
        systems — <b className="text-foreground">3 matches</b>
      </>
    ),
  },
  {
    icon: '›',
    text: (
      <>
        Matched on <b className="text-foreground">email + last name</b> in Billing &amp; CRM. Marketing match
        is low-confidence.
      </>
    ),
  },
];

const SOURCE_BADGES = [
  { label: 'Billing · 1', dashed: false },
  { label: 'CRM · 1', dashed: false },
  { label: 'Support · 1', dashed: false },
  { label: 'Marketing · low', dashed: true },
];

function LiveDashboardMock() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-3.5 rounded-3xl"
        style={{ background: 'radial-gradient(120% 90% at 80% 0%, hsl(var(--accent-tint)) 0%, transparent 60%)' }}
        aria-hidden
      />
      <div className="dsar-card-elevated relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* window bar */}
        <div className="flex items-center gap-2.5 border-b border-[hsl(var(--line-soft-3))] bg-[hsl(var(--line-soft-2))] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E0E2EA]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#E0E2EA]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#E0E2EA]" />
          </div>
          <div className="ml-2 font-mono text-xs text-[hsl(var(--text-faint))]">instrata · operator</div>
          <div className="ml-auto flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[hsl(var(--success))]">
            <span className="dsar-livepulse h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
            LIVE
          </div>
        </div>

        {/* request header */}
        <div className="border-b border-[hsl(var(--line-soft))] px-[18px] pb-3.5 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-[hsl(var(--text-faint))]">DSAR-2041</span>
            <Badge variant="accent">Right to Know</Badge>
            <span className="ml-auto">
              <Badge variant="warn">SLA · 6d left</Badge>
            </span>
          </div>
          <div className="mt-2.5 text-[15px] font-bold text-foreground">Dana Whitfield · dana.w@example.com</div>
          <div className="mt-0.5 text-xs text-[hsl(var(--text-faint))]">California (CCPA) · identity verified</div>
        </div>

        {/* agent activity */}
        <div className="bg-[hsl(var(--line-soft-2))] px-[18px] py-3.5">
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--text-faint))]">
            Agent activity
          </div>
          <div className="flex flex-col gap-2.5">
            {AGENT_ACTIVITY.map((row, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-[5px] bg-[hsl(var(--accent-tint))] font-mono text-[10px] text-[hsl(var(--primary))]">
                  {row.icon}
                </span>
                <div className="text-[13px] leading-snug text-[hsl(var(--text-secondary))]">{row.text}</div>
              </div>
            ))}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {SOURCE_BADGES.map((b) => (
              <span
                key={b.label}
                className={`rounded-[7px] border bg-card px-2.5 py-1 font-mono text-[11px] ${
                  b.dashed
                    ? 'border-dashed border-border text-[#B0708F]'
                    : 'border-border text-[hsl(var(--text-secondary))]'
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* approval gate */}
        <div className="flex items-center gap-3 border-t border-[hsl(var(--line-soft))] px-[18px] py-3.5">
          <div className="flex-1">
            <div className="text-[12.5px] font-bold text-foreground">Proposed action · Compile disclosure package</div>
            <div className="mt-0.5 text-[11.5px] text-[hsl(var(--text-faint))]">
              Awaiting operator approval — no export until approved
            </div>
          </div>
          <span className="whitespace-nowrap rounded-lg border border-[hsl(var(--warn-tint-border))] bg-[hsl(var(--warn-tint))] px-2.5 py-1.5 text-[11px] font-bold text-[hsl(var(--warning))]">
            GATE
          </span>
          <span className="whitespace-nowrap rounded-[9px] bg-[hsl(var(--success))] px-3.5 py-2 text-[12.5px] font-semibold text-white">
            Approve
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-8 pb-10 pt-[72px] lg:grid-cols-[1.02fr_1.15fr]">
      <div>
        <div className="inline-flex items-center gap-2.5 rounded-full border border-[hsl(var(--accent-tint-border))] bg-[hsl(var(--accent-tint))] px-3 py-1.5 font-mono text-[12.5px] font-semibold text-[hsl(var(--accent-foreground))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
          OPEN SOURCE · APACHE-2.0
        </div>
        <h1 className="mt-5 text-balance text-[52px] font-extrabold leading-[1.04] tracking-[-0.028em] text-foreground">
          Open-source AI-native privacy ops for DSAR workflows
        </h1>
        <p className="mt-5 max-w-[33ch] text-[18.5px] leading-[1.5] text-[hsl(var(--text-body))]">
          Governed AI agents that help privacy teams intake, search, reason, evidence, and approve DSAR work —
          without losing auditability or control.
        </p>
        <div className="mt-7 flex flex-wrap gap-3.5">
          <Button asChild size="lg" className="dsar-cta-shadow gap-2 rounded-[11px] bg-primary text-[15.5px] font-semibold hover:bg-[hsl(var(--accent-foreground))]">
            <Link href="/dsar/demo">View the Demo →</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 rounded-[11px] border-[hsl(var(--input))] text-[15.5px] font-semibold hover:border-foreground">
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <span className="font-mono text-[13px]">★</span> Explore on GitHub
            </a>
          </Button>
        </div>
        <div className="mt-9 flex flex-wrap gap-6 text-[13px] text-muted-foreground">
          {['Human-in-the-loop by default', 'Full evidence & audit trail', 'No side effects without approval'].map(
            (item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="font-bold text-[hsl(var(--success))]">✓</span> {item}
              </div>
            )
          )}
        </div>
      </div>
      <LiveDashboardMock />
    </section>
  );
}
