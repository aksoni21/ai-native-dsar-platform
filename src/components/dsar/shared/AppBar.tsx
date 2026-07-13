import Link from 'next/link';
import { LogoMark } from './LogoMark';

interface AppBarProps {
  /** Breadcrumb segments after the logo, e.g. ["Dashboard", "DSAR-2041"] */
  crumbs?: { label: string; href?: string }[];
  right?: React.ReactNode;
}

/** Dark app bar shared by /dsar/demo and /dsar/dashboard. */
export function AppBar({ crumbs = [], right }: AppBarProps) {
  return (
    <header className="bg-[hsl(var(--foreground))] text-white">
      <div className="mx-auto flex max-w-[1360px] items-center gap-5 px-7 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-[15.5px] font-bold text-white">
          <LogoMark variant="onDark" size={24} />
          Instrata AI
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-5">
            <span className="text-[#3A4152]">/</span>
            {c.href ? (
              <Link href={c.href} className="text-sm font-medium text-[#B7BDCC] hover:text-white">
                {c.label}
              </Link>
            ) : (
              <span className="font-mono text-sm font-semibold text-white">{c.label}</span>
            )}
          </span>
        ))}
        <div className="ml-auto">{right}</div>
      </div>
    </header>
  );
}
