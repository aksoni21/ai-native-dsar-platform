'use client';

import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getAuditTrail, getPrimaryApplicant } from '@/lib/ai-gov/data';
import { ReviewerCasePane } from '@/components/ai-gov/demo/ReviewerCasePane';

const SUBTITLE: Record<string, string> = {
  lending: '§1705 reconsideration. Model reasoning, inputs, and prior decision — in one pane.',
  hr: 'Candidate review under LL 144 alternative-process. Single reviewer console.',
  automotive:
    'Reconsideration challenges the use of telematics from a prior connected vehicle. Cross-system lineage in one pane.',
};

export default function HumanReviewPage() {
  const { vertical } = useVertical();
  const applicant = getPrimaryApplicant(vertical);
  const audit = getAuditTrail(vertical);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Human review</h1>
        <p className="text-sm text-muted-foreground mt-1">{SUBTITLE[vertical]}</p>
      </header>

      <ReviewerCasePane applicant={applicant} audit={audit} vertical={vertical} />
    </div>
  );
}
