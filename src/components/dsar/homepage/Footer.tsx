import Link from 'next/link';
import { LogoMark } from '../shared/LogoMark';

const PRODUCT_LINKS = [
  { label: 'Demo', href: '/dsar/demo' },
  { label: 'Operator dashboard', href: '/dsar/dashboard' },
  { label: 'Intake portal', href: '/dsar/intake' },
];

const RESOURCE_LINKS = [
  { label: 'Documentation', href: '/dsar/docs' },
  { label: 'GitHub', href: 'https://github.com/aksoni21/ai-native-dsar-platform' },
  { label: 'License · Apache-2.0', href: '#' },
];

const COMPANY_LINKS = [
  { label: 'Contact', href: '#' },
  { label: 'Architecture', href: '/dsar/docs' },
  { label: 'AI Governance', href: '/ai-gov' },
  { label: 'Platform', href: '/platform' },
];

function LinkColumn({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.06em] text-[#5B6172]">{heading}</div>
      <div className="mt-3.5 flex flex-col gap-2.5 text-sm">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="text-[#B7BDCC] hover:text-white">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-[hsl(var(--ink-2))] text-[hsl(var(--text-faint))]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-8 pb-10 pt-14 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5 text-[17px] font-bold text-white">
            <LogoMark variant="onDark" size={26} />
            Instrata AI
          </div>
          <p className="mt-4 max-w-[32ch] text-sm leading-[1.55] text-[hsl(var(--text-faint))]">
            Open-source, AI-native privacy operations for DSAR workflows. Governed by design.
          </p>
        </div>
        <LinkColumn heading="Product" links={PRODUCT_LINKS} />
        <LinkColumn heading="Resources" links={RESOURCE_LINKS} />
        <LinkColumn heading="Company" links={COMPANY_LINKS} />
      </div>
      <div className="border-t border-[hsl(var(--ink-border-2))]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-8 py-5 font-mono text-[12.5px] text-[#5B6172]">
          <span>© 2026 Instrata AI · Apache-2.0</span>
          <span>Human-in-the-loop · No side effects without approval</span>
        </div>
      </div>
    </footer>
  );
}
