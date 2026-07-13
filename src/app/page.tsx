import type { Metadata } from 'next';
import { DsarThemeShell } from '@/components/dsar/DsarThemeShell';
import { Nav } from '@/components/dsar/homepage/Nav';
import { Hero } from '@/components/dsar/homepage/Hero';
import { TrustStrip } from '@/components/dsar/homepage/TrustStrip';
import { ProblemSection } from '@/components/dsar/homepage/ProblemSection';
import { ProductWalkthrough } from '@/components/dsar/homepage/ProductWalkthrough';
import { CapabilitiesSection } from '@/components/dsar/homepage/CapabilitiesSection';
import { GovernanceSection } from '@/components/dsar/homepage/GovernanceSection';
import { DemoCtaSection } from '@/components/dsar/homepage/DemoCtaSection';
import { OpenSourceSection } from '@/components/dsar/homepage/OpenSourceSection';
import { BookDemoSection } from '@/components/dsar/homepage/BookDemoSection';
import { Footer } from '@/components/dsar/homepage/Footer';

export const metadata: Metadata = {
  title: 'Instrata AI — Open-source AI-native privacy ops',
  description:
    'Governed AI agents that help privacy teams intake, search, reason, evidence, and approve DSAR work — without losing auditability or control.',
};

export default function Home() {
  return (
    <DsarThemeShell>
      <Nav />
      <Hero />
      <TrustStrip />
      <ProblemSection />
      <ProductWalkthrough />
      <CapabilitiesSection />
      <GovernanceSection />
      <DemoCtaSection />
      <OpenSourceSection />
      <BookDemoSection />
      <Footer />
    </DsarThemeShell>
  );
}
