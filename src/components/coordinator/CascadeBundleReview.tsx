'use client';

import { useMemo, useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
  Check,
  CheckCircle2,
  Layers,
  Users,
  ScrollText,
  FileText,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CascadeOutputs } from '@/types';

interface CascadeBundleReviewProps {
  outputs: CascadeOutputs;
  approved: boolean;
  approvedAt: string | null;
  onApprove: () => void;
}

interface SectionDef {
  key: keyof CascadeOutputs | 'consumer_reply';
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subAgent: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'identity_resolution',
    Icon: Users,
    title: 'Identity resolution',
    subAgent: 'identity-resolver',
  },
  {
    key: 'disposition_plan',
    Icon: ScrollText,
    title: 'Updated disposition plan',
    subAgent: 'disposition-planner',
  },
  {
    key: 'compliance_report',
    Icon: FileText,
    title: 'Regenerated compliance report',
    subAgent: 'report-generator',
  },
  {
    key: 'consumer_reply',
    Icon: Mail,
    title: 'Drafted reply to consumer',
    subAgent: 'consumer-reply-drafter',
  },
];

function formatStableDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

export function CascadeBundleReview({
  outputs,
  approved,
  approvedAt,
  onApprove,
}: CascadeBundleReviewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    identity_resolution: true,
    disposition_plan: false,
    compliance_report: false,
    consumer_reply: false,
  });
  const [readSections, setReadSections] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    // Expanding counts as "read" — tracks the operator's attestation.
    setReadSections((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const sectionsAvailable = useMemo(
    () =>
      SECTIONS.filter((s) => {
        if (s.key === 'consumer_reply') {
          return !!outputs.consumer_reply_draft;
        }
        const v = outputs[s.key as keyof CascadeOutputs];
        return typeof v === 'string' && v.length > 0;
      }),
    [outputs],
  );

  const allRead = sectionsAvailable.every((s) => readSections[s.key]);
  const readCount = sectionsAvailable.filter((s) => readSections[s.key]).length;

  return (
    <Card className="border-[hsl(var(--info)/0.5)] bg-[hsl(var(--info)/0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <Layers className="h-4 w-4 text-[hsl(var(--info))]" />
          Izzy&apos;s cascade — sub-agent fan-out
          <Badge variant="outline" className="border-[hsl(var(--info)/0.5)] text-[hsl(var(--info))] text-[10px]">
            <Sparkles className="mr-1 h-3 w-3" /> Izzy
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            {outputs.sub_agents_used.length} sub-agents
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'ml-auto text-[10px]',
              allRead
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300',
            )}
          >
            {readCount}/{sectionsAvailable.length} read
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          When the consumer's clarifying reply landed new identity info, the Coordinator fanned
          out four sub-agents in parallel and bundled their drafts here. Each section stays a
          draft until you approve the bundle — the agent never wrote anything.
        </p>

        {sectionsAvailable.map((section) => {
          const isOpen = !!expanded[section.key];
          const wasRead = !!readSections[section.key];
          const Icon = section.Icon;

          let body: React.ReactNode = null;
          if (section.key === 'consumer_reply' && outputs.consumer_reply_draft) {
            body = (
              <div className="space-y-2">
                <div className="grid grid-cols-[68px_1fr] gap-1.5 text-xs">
                  <span className="text-muted-foreground">Subject</span>
                  <span className="font-mono">{outputs.consumer_reply_draft.subject}</span>
                </div>
                <pre className="thin-scroll whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs leading-relaxed font-mono">
                  {outputs.consumer_reply_draft.body}
                </pre>
              </div>
            );
          } else {
            const text = outputs[section.key as keyof CascadeOutputs];
            if (typeof text === 'string') {
              body = (
                <pre className="thin-scroll whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs leading-relaxed font-mono">
                  {text}
                </pre>
              );
            }
          }

          return (
            <div
              key={section.key}
              className={cn(
                'rounded-md border bg-background',
                wasRead
                  ? 'border-emerald-300/70 dark:border-emerald-800/70'
                  : 'border-border',
              )}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(section.key)}
                className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/30"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Icon className="h-4 w-4 text-[hsl(var(--info))]" />
                <span className="font-medium">{section.title}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {section.subAgent}
                </Badge>
                {wasRead ? (
                  <Badge
                    variant="outline"
                    className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]"
                  >
                    <Eye className="mr-1 h-3 w-3" /> read
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="ml-auto border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px]"
                  >
                    not yet read
                  </Badge>
                )}
              </button>
              {isOpen && <div className="border-t border-border/60 px-3 py-3">{body}</div>}
            </div>
          );
        })}

        {/* Approve gate */}
        {!approved ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="sm"
              disabled={!allRead}
              onClick={onApprove}
              className="gap-1.5"
            >
              {allRead ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {allRead ? 'Approve bundle' : `Open all ${sectionsAvailable.length} drafts to unlock`}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              On approve, the post-approval execution pipeline applies the new disposition,
              sends the consumer reply, and resets the SLA clock. Agent never writes.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Bundle approved by operator@instrata.com</span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">
              {formatStableDateTime(approvedAt)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
