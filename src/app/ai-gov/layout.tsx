import { Inter, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ai-gov/layout/ThemeProvider';
import { VerticalProvider } from '@/context/ai-gov/VerticalContext';
import './ai-gov-theme.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Instrata Governance in Layers — Demo',
  description: 'Governance in layers for AI in consequential decisions',
};

export default function AiGovLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`ai-gov-theme font-sans ${sans.variable} ${serif.variable} ${mono.variable}`}
    >
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <VerticalProvider>{children}</VerticalProvider>
      </ThemeProvider>
    </div>
  );
}
