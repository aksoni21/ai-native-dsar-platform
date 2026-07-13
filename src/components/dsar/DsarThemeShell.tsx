import { Figtree, IBM_Plex_Mono } from 'next/font/google';
import '@/app/dsar/dsar-theme.css';

const sans = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

/** Shared theme scope for every DSAR-design screen — the promoted root
 * homepage and everything still under /dsar/* both wrap in this, so the
 * palette/fonts are defined once instead of duplicated per entry point. */
export function DsarThemeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`dsar-theme font-sans ${sans.variable} ${mono.variable}`}>{children}</div>
  );
}
