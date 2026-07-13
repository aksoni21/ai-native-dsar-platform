import Link from 'next/link';
import { LogoMark } from '../shared/LogoMark';
import { Button } from '@/components/ui/button';

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--line-soft-3))] bg-[hsl(var(--background))]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1200px] items-center gap-8 px-8 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-foreground">
          <LogoMark />
          Instrata AI
        </Link>
        <div className="ml-3 hidden items-center gap-6 text-[14.5px] font-medium text-[hsl(var(--text-secondary))] sm:flex">
          <a href="#product" className="hover:text-foreground">Product</a>
          <a href="#governance" className="hover:text-foreground">Governance</a>
          <Link href="/dsar/docs" className="hover:text-foreground">Docs</Link>
          <Link href="/dsar/dashboard" className="hover:text-foreground">Dashboard</Link>
          <Link href="/ai-gov" className="hover:text-foreground">AI Governance</Link>
          <Link href="/platform" className="hover:text-foreground">Platform</Link>
        </div>
        <div className="ml-auto flex items-center gap-3.5">
          <Button
            asChild
            variant="outline"
            className="gap-1.5 rounded-[9px] border-[hsl(var(--input))] font-semibold hover:border-foreground"
          >
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <span className="font-mono text-xs text-muted-foreground">★</span> GitHub
            </a>
          </Button>
          <Button asChild className="dsar-cta-shadow rounded-[9px] bg-primary font-semibold hover:bg-[hsl(var(--accent-foreground))]">
            <Link href="/dsar/demo">View the Demo</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
