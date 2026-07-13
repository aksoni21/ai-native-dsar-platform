import { CalendlyEmbed } from '@/components/CalendlyEmbed';

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

export function BookDemoSection() {
  if (!CALENDLY_URL) return null;

  return (
    <section className="border-t border-[hsl(var(--line-soft-3))] px-8 py-20">
      <div className="mx-auto max-w-[900px] text-center">
        <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
          Ready when you are
        </div>
        <h2 className="mt-3.5 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground">
          Talk to us, no waitlist required
        </h2>
        <p className="mt-3.5 text-[16.5px] leading-[1.55] text-[hsl(var(--text-body))]">
          Thirty minutes. We&apos;ll walk your team through one request — search, reasoning, evidence, approval
          gate — end to end.
        </p>
        <div className="mt-8">
          <CalendlyEmbed url={CALENDLY_URL} height={700} backgroundColor="ffffff" textColor="12141c" />
        </div>
      </div>
    </section>
  );
}
