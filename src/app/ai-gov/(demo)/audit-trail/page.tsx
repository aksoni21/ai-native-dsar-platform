'use client';

import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getAuditTrail } from '@/lib/ai-gov/data';
import { AuditTrailTable } from '@/components/ai-gov/demo/AuditTrailTable';

export default function AuditTrailPage() {
  const { vertical } = useVertical();
  const audit = getAuditTrail(vertical);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Decision audit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Append-only. Regulator-exportable. One row per consequential event.
        </p>
      </header>

      <AuditTrailTable initialAudit={audit} vertical={vertical} />
    </div>
  );
}
