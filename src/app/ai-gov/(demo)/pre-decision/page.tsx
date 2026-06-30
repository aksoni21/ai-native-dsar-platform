'use client';

import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getDisclosures } from '@/lib/ai-gov/data';
import { ApplicationPageMock } from '@/components/ai-gov/demo/ApplicationPageMock';
import type { JurisdictionCode } from '@/types/ai-gov';

export default function PreDecisionPage() {
  const { vertical } = useVertical();
  const disclosures = getDisclosures(vertical);
  const code: JurisdictionCode =
    vertical === 'lending' ? 'CO' : vertical === 'hr' ? 'NY' : 'CA';
  const notice = disclosures.by_jurisdiction[code];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Pre-decision notice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rendered on the application page. Jurisdiction-aware, content-element-checked.
        </p>
      </header>

      {notice && <ApplicationPageMock notice={notice} />}
    </div>
  );
}
