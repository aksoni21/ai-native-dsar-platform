'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/ai-gov/layout/Sidebar';
import { TopBar } from '@/components/ai-gov/layout/TopBar';
import { StepFooter } from '@/components/ai-gov/layout/StepFooter';
import { MobileNav } from '@/components/ai-gov/layout/MobileNav';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col">
        <TopBar onOpenMobileNav={() => setNavOpen(true)} />
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">{children}</main>
        <StepFooter />
      </div>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </div>
  );
}
