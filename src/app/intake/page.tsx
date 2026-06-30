'use client';

import { IntakeForm, REQUEST_TYPES } from '@/components/intake/IntakeForm';
import {
  Eye,
  Trash2,
  Pencil,
  ShieldOff,
  Lock,
  Download,
  ShieldCheck,
  Scale,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

/**
 * /intake — Privacy Rights Portal.
 * Combines: cinematic hero strip · iconized + polished request cards · trust footer.
 * The page-header strip is intentionally omitted — the hero already provides branding.
 */

const ICONIZED = REQUEST_TYPES.map((rt) => {
  switch (rt.id) {
    case 'know':
      return { ...rt, icon: Eye, iconClass: 'bg-blue-100 text-blue-700' };
    case 'delete':
      return { ...rt, icon: Trash2, iconClass: 'bg-red-100 text-red-700' };
    case 'correct':
      return { ...rt, icon: Pencil, iconClass: 'bg-amber-100 text-amber-700' };
    case 'opt_out':
      return { ...rt, icon: ShieldOff, iconClass: 'bg-violet-100 text-violet-700' };
    case 'limit_sensitive':
      return { ...rt, icon: Lock, iconClass: 'bg-rose-100 text-rose-700' };
    case 'portability':
      return { ...rt, icon: Download, iconClass: 'bg-emerald-100 text-emerald-700' };
    default:
      return rt;
  }
});

export default function IntakePage() {
  return (
    <IntakeForm
      theme={{
        requestTypes: ICONIZED,
        polish: true,
        headerSlot: null,
        heroSlot: (
          <section className="relative isolate overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-cover bg-center"
              style={{ backgroundImage: 'url(/hero-cave-hills.jpg)' }}
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(6,9,18,0.7) 0%, rgba(6,9,18,0.55) 60%, rgba(6,9,18,0.95) 100%)',
              }}
            />
            <div className="mx-auto max-w-6xl px-4 py-16 text-white md:py-24">
              <Link
                href="/"
                className="group mb-6 inline-flex items-center gap-1.5 text-[12px] font-medium text-white/70 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                Back to home
              </Link>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/55">
                Instrata · Privacy Rights Portal
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
                Submit a privacy request.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
                We respond within 7 days; full action within the 45-day statutory deadline.
                Encrypted in transit, identity-verified at intake, citation-backed in audit.
              </p>
            </div>
          </section>
        ),
        footerSlot: (
          <section className="border-t border-border bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-10">
              <div className="grid gap-6 md:grid-cols-4">
                <TrustItem
                  icon={Lock}
                  title="Encrypted in transit"
                  body="Submitted over HTTPS. Stored encrypted. Access logged."
                />
                <TrustItem
                  icon={ShieldCheck}
                  title="Identity verified"
                  body="We confirm it&rsquo;s you before any data action — never on a guess."
                />
                <TrustItem
                  icon={Scale}
                  title="Citation-backed"
                  body="Every disposition is tied to a specific statute clause."
                />
                <TrustItem
                  icon={Clock}
                  title="45-day statutory deadline"
                  body="State law requires action within 45 days; we typically respond in 7."
                />
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
                <span>
                  Need another way to submit?{' '}
                  <a className="underline underline-offset-2" href="mailto:privacy@example.com">
                    privacy@example.com
                  </a>{' '}
                  ·{' '}
                  <a className="underline underline-offset-2" href="tel:+18005550100">
                    1-800-555-0100
                  </a>
                </span>
                <span className="font-mono uppercase tracking-[0.2em]">instrata</span>
              </div>
            </div>
          </section>
        ),
      }}
    />
  );
}

function TrustItem({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-border">
        <Icon className="h-4 w-4 text-foreground/80" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
