'use client';

import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getDisclosures, getPrimaryApplicant } from '@/lib/ai-gov/data';
import { AdverseOutcomeLetter } from '@/components/ai-gov/demo/AdverseOutcomeLetter';
import type { JurisdictionCode } from '@/types/ai-gov';

export default function AdverseOutcomePage() {
  const { vertical } = useVertical();
  const applicant = getPrimaryApplicant(vertical);
  const disclosures = getDisclosures(vertical);
  const code: JurisdictionCode = applicant.state as JurisdictionCode;
  const notice = disclosures.by_jurisdiction[code];

  if (!notice) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Adverse outcome</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Augmented through {notice.adverse_outcome.federal_bridge ?? 'state regime'} — never a duplicate notice.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="text-foreground">{applicant.name}</span> · {applicant.id}
        </span>
        <span>{applicant.product_or_role}</span>
        <span className="font-mono">{applicant.vendor}</span>
      </div>

      <AdverseOutcomeLetter notice={notice} />
    </div>
  );
}
