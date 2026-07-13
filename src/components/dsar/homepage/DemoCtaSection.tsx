import Link from 'next/link';
import { Button } from '@/components/ui/button';

const STEPS = [
  { n: '01', label: 'Intake & identity' },
  { n: '02', label: 'Agent search & reasoning' },
  { n: '03', label: 'Operator approval gate' },
];

export function DemoCtaSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-8 py-[84px]">
      <div
        className="grid grid-cols-1 gap-10 rounded-[20px] border border-[hsl(var(--accent-tint-border))] p-[52px] lg:grid-cols-[1.3fr_1fr] lg:items-center"
        style={{ background: 'linear-gradient(180deg, hsl(var(--accent-tint)) 0%, hsl(var(--card)) 100%)' }}
      >
        <div>
          <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
            Live demo
          </div>
          <h2 className="mt-3.5 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground">
            See a Right to Know request, end to end
          </h2>
          <p className="mt-3.5 text-[16.5px] leading-[1.55] text-[hsl(var(--text-body))]">
            Walk a real request from intake through operator review — agent search, match reasoning,
            evidence capture, and the approval gate before any action fires.
          </p>
          <div className="mt-[26px] flex flex-wrap gap-3.5">
            <Button asChild className="dsar-cta-shadow gap-2 rounded-[11px] bg-primary text-[15.5px] font-semibold hover:bg-[hsl(var(--accent-foreground))]">
              <Link href="/dsar/demo">Launch the demo →</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-[11px] border-[hsl(var(--input))] text-[15.5px] font-semibold hover:border-foreground">
              <Link href="/dsar/intake">Try the intake form</Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <span className="font-mono text-xs text-primary">{s.n}</span>
              <span className="text-sm font-semibold text-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
