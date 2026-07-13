'use client';

import Link from 'next/link';
import { Eye, Trash2, Pencil, ShieldOff, Lock, Download } from 'lucide-react';
import { IntakeForm, REQUEST_TYPES, type RequestTypeDef } from '@/components/intake/IntakeForm';
import { LogoMark } from '@/components/dsar/shared/LogoMark';

// Reuses the real, backend-wired IntakeForm (POSTs to /api/intake, gets a
// real request_id + deadline back) — just re-skinned via its theme prop
// instead of a hand-rolled mock form. Icon/color per request type mapped
// onto our existing semantic tokens rather than ad-hoc Tailwind palette
// colors, to stay inside the single-accent design system.
const ICONIZED: RequestTypeDef[] = REQUEST_TYPES.map((rt) => {
  switch (rt.id) {
    case 'know':
      return { ...rt, icon: Eye, iconClass: 'bg-[hsl(var(--accent-tint))] text-primary' };
    case 'delete':
      return { ...rt, icon: Trash2, iconClass: 'bg-[hsl(var(--danger-tint))] text-[hsl(var(--destructive))]' };
    case 'correct':
      return { ...rt, icon: Pencil, iconClass: 'bg-[hsl(var(--warn-tint))] text-[hsl(var(--warning))]' };
    case 'opt_out':
      return { ...rt, icon: ShieldOff, iconClass: 'bg-[hsl(var(--accent-tint))] text-primary' };
    case 'limit_sensitive':
      return { ...rt, icon: Lock, iconClass: 'bg-[hsl(var(--danger-tint))] text-[hsl(var(--destructive))]' };
    case 'portability':
      return { ...rt, icon: Download, iconClass: 'bg-[hsl(var(--success-tint))] text-[hsl(var(--success))]' };
    default:
      return rt;
  }
});

export default function DsarIntakePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <nav className="mx-auto flex max-w-[1000px] items-center gap-4 px-7 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <LogoMark size={24} />
            Instrata AI
          </Link>
          <span className="ml-auto flex items-center gap-2 text-[13px] text-[hsl(var(--text-faint))]">
            🔒 Secure privacy request portal
          </span>
        </nav>
      </header>

      <IntakeForm
        theme={{
          headerSlot: null,
          pageClassName: 'flex-1 bg-background',
          requestTypes: ICONIZED,
          polish: true,
        }}
      />
    </div>
  );
}
