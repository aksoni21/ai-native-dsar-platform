'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Undo2 } from 'lucide-react';
import type { ApplicantProfile, AuditData, Vertical } from '@/types/ai-gov';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Button } from '@/components/ai-gov/ui/button';
import { Badge } from '@/components/ai-gov/ui/badge';
import { Separator } from '@/components/ai-gov/ui/separator';
import { ReviewerSummaryCard } from './ReviewerSummaryCard';
import { formatDateTime } from '@/lib/ai-gov/utils';
import { ROUTE_PREFIX } from '@/lib/ai-gov/constants';

interface Props {
  applicant: ApplicantProfile;
  audit: AuditData;
  vertical: Vertical;
}

export function ReviewerCasePane({ applicant, audit, vertical }: Props) {
  const router = useRouter();
  const [overturned, setOverturned] = useState(false);

  const reasoningEntries = audit.entries
    .filter((e) => e.actor === 'system' && (e.action === 'model_scored' || e.action === 'decision_recorded'))
    .slice(0, 2);

  function handleOverturn() {
    setOverturned(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `naica_override_${applicant.id}`,
        JSON.stringify({
          ts: new Date().toISOString(),
          reviewer: vertical === 'lending' ? 'Olivia Mendez' : 'Devon Hall',
          new_outcome: vertical === 'lending' ? 'approved' : 'advanced',
        })
      );
    }
    setTimeout(() => {
      router.push(`${ROUTE_PREFIX}/audit-trail`);
    }, 700);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {applicant.name} — {applicant.product_or_role}
            </CardTitle>
            <Badge variant="destructive" className="uppercase tracking-wider">
              {applicant.decision.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Fact label="ID" value={applicant.id} />
            <Fact label="State" value={applicant.state} />
            <Fact label="Decision at" value={formatDateTime(applicant.decision_at)} />
            <Fact label="Model" value={`${applicant.vendor}`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Model reasoning
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {reasoningEntries.map((e) => (
              <div key={e.id} className="rounded-md border bg-muted/30 px-2 py-2">
                <div className="font-mono text-[10px] text-muted-foreground">
                  {formatDateTime(e.ts)}
                </div>
                <div className="mt-0.5">{e.detail}</div>
                {typeof e.admt_influence === 'number' && (
                  <div className="mt-1 text-muted-foreground">
                    Influence <span className="font-mono">{e.admt_influence.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Inputs used
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            {applicant.factors.map((f) => (
              <div key={f} className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5">
                <span className="font-mono text-[11px]">{f}</span>
              </div>
            ))}
            {applicant.ecoa_codes && applicant.ecoa_codes.length > 0 && (
              <>
                <Separator className="my-1.5" />
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  ECOA codes
                </div>
                <div className="flex flex-wrap gap-1">
                  {applicant.ecoa_codes.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] font-mono">
                      {c}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Prior decision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Fact label="Decision" value={applicant.decision.replace('_', ' ')} />
            <Fact label="Confidence" value={`${Math.round(applicant.confidence * 100)}%`} />
            <Fact label="Reconsideration" value="Filed — see audit trail" />
          </CardContent>
        </Card>
      </div>

      <ReviewerSummaryCard applicantId={applicant.id} vertical={vertical} />

      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Reviewer outcome will be appended to the immutable audit trail.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={overturned}>
              Uphold decision
            </Button>
            <Button onClick={handleOverturn} disabled={overturned}>
              {overturned ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Overturned — logging…
                </>
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-1.5" />
                  Overturn & approve
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground mt-0.5 break-all">{value}</div>
    </div>
  );
}
