'use client';

import { ShieldAlert } from 'lucide-react';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { CohortStats } from '@/components/ai-gov/demo/CohortStats';
import { ExportPacketButton } from '@/components/ai-gov/demo/ExportPacketButton';
import { CoActCoverage } from '@/components/ai-gov/demo/CoActCoverage';
import { PlatformVisionMap } from '@/components/ai-gov/demo/PlatformVisionMap';
import { Badge } from '@/components/ai-gov/ui/badge';

export default function DashboardPage() {
  const { vertical } = useVertical();
  const refLabel =
    vertical === 'lending'
      ? 'CO-AG-2026-0418'
      : vertical === 'hr'
      ? 'NYC-DCWP-2026-0271'
      : 'CPPA-AUTO-2026-1107';
  const regulator =
    vertical === 'lending'
      ? 'Colorado AG'
      : vertical === 'hr'
      ? 'NYC DCWP'
      : 'California CPPA';

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
          <Badge variant="destructive" className="uppercase tracking-wider">
            Active inquiry
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">{refLabel}</span>
        </div>
        <h1 className="font-serif text-3xl">Response workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cohort, vendor evidence, and decision audit — pre-loaded for the {regulator} inquiry.
        </p>
      </header>

      <CohortStats />
      <ExportPacketButton />
      <CoActCoverage />
      <PlatformVisionMap />
    </div>
  );
}
