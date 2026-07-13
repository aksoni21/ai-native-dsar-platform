import type { Metadata } from 'next';
import { DsarThemeShell } from '@/components/dsar/DsarThemeShell';

export const metadata: Metadata = {
  title: 'Instrata AI — Open-source AI-native privacy ops',
  description:
    'Governed AI agents that help privacy teams intake, search, reason, evidence, and approve DSAR work — without losing auditability or control.',
};

export default function DsarLayout({ children }: { children: React.ReactNode }) {
  return <DsarThemeShell>{children}</DsarThemeShell>;
}
