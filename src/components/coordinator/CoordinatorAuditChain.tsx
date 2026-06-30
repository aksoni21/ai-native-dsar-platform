'use client';

import {
  Mail,
  MailOpen,
  UserCheck,
  Zap,
  Sparkles,
  FileText,
  Search,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AuditEntry } from '@/types';

function formatStableDateTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

type ActorKind = 'pipeline' | 'coordinator' | 'human' | 'execution_pipeline' | 'system';

function classifyActor(actor: string): ActorKind {
  if (actor.startsWith('agent:coordinator')) return 'coordinator';
  if (actor.startsWith('agent:')) return 'pipeline';
  if (actor.startsWith('human:')) return 'human';
  if (actor.startsWith('system:execution_pipeline')) return 'execution_pipeline';
  return 'system';
}

interface ActorVisual {
  Icon: React.ComponentType<{ className?: string }>;
  ringClass: string;
  iconClass: string;
  badgeClass: string;
}

const ACTOR_VISUAL: Record<ActorKind, ActorVisual> = {
  pipeline: {
    Icon: Sparkles,
    ringClass: 'border-border bg-background',
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  coordinator: {
    Icon: Mail,
    ringClass: 'border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.08)]',
    iconClass: 'text-[hsl(var(--info))]',
    badgeClass: 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
  },
  human: {
    Icon: UserCheck,
    ringClass: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  execution_pipeline: {
    Icon: Zap,
    ringClass: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    iconClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  system: {
    Icon: FileText,
    ringClass: 'border-border bg-background',
    iconClass: 'text-muted-foreground',
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

const ACTION_VERB: Record<string, string> = {
  orphan_outreach_drafted: 'drafted outreach to Legacy CRM Archive team',
  redirect_outreach_drafted: 'drafted redirect outreach to new team',
  clarification_drafted: 'drafted clarification email to consumer',
  confirmation_drafted: 'drafted DSAR confirmation',
  outbound_approved: 'approved outbound for send',
  outbound_sent: 'sent outbound (mock)',
  inbound_received: 'received inbound reply',
  inbound_parsed: 'parsed inbound reply',
  attribution_applied: 'applied attribution',
  cascade_run_started: 'started cascade fan-out across sub-agents',
  identity_resolved: 'resolved cross-system identity',
  disposition_planned: 'planned regulator-ready disposition',
  compliance_report_generated: 'generated compliance report',
  consumer_reply_drafted: 'drafted consumer reply email',
  cascade_run_completed: 'completed cascade fan-out',
  cascade_bundle_approved: 'approved cascade bundle',
  searched: 'searched source systems',
  scored: 'scored matches',
  rules_applied: 'applied compliance rules',
  vin_expanded: 'expanded VINs from PII matches',
  vin_keyed_search: 'searched VIN-keyed sources within ownership window',
  created: 'created request',
};

function verbForAction(action: string): string {
  return ACTION_VERB[action] ?? action.replace(/_/g, ' ');
}

function actorLabel(actor: string): string {
  if (actor.startsWith('human:')) return actor.slice('human:'.length);
  if (actor === 'agent:coordinator') return 'Izzy';
  if (actor === 'agent:vin_expansion') return 'VIN Expansion agent';
  if (actor.startsWith('agent:')) return actor.slice('agent:'.length);
  if (actor === 'system:execution_pipeline') return 'Execution pipeline';
  return actor;
}

interface CoordinatorAuditChainProps {
  entries: AuditEntry[];
  /** Optional title override */
  title?: string;
  /** When provided, only entries for this case_id (stored in details) are shown. */
  filterCaseId?: string;
}

export function CoordinatorAuditChain({ entries, title = 'Coordinator audit chain', filterCaseId }: CoordinatorAuditChainProps) {
  const filtered = filterCaseId
    ? entries.filter((e) => (e.details as { case_id?: string })?.case_id === filterCaseId)
    : entries;

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (sorted.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {title}
          <Badge variant="secondary" className="ml-2">
            {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
          </Badge>
          <span className="ml-auto text-[11px] text-muted-foreground">
            actor + timestamp + source citation per Coordinator §3
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {sorted.map((entry, index) => {
            const kind = classifyActor(entry.actor);
            const visual = ACTOR_VISUAL[kind];
            const Icon = visual.Icon;
            const actor = actorLabel(entry.actor);
            const verb = verbForAction(entry.action);
            const isLast = index === sorted.length - 1;
            const detailEntries = entry.details
              ? Object.entries(entry.details).filter(
                  ([k]) => k !== 'case_id' && k !== 'message_id',
                )
              : [];

            return (
              <div key={entry.id} className="relative flex gap-3">
                {!isLast && (
                  <div className="absolute left-[15px] top-9 bottom-0 w-0.5 bg-border" />
                )}
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border',
                    visual.ringClass,
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', visual.iconClass)} />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm">
                      <span className={cn('font-semibold', kind === 'human' && 'text-emerald-700 dark:text-emerald-300')}>
                        {actor}
                      </span>{' '}
                      <span className="text-muted-foreground">{verb}</span>
                    </span>
                    <Badge variant="outline" className={cn('text-[10px]', visual.badgeClass)}>
                      {entry.actor}
                    </Badge>
                    <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground">
                      {formatStableDateTime(entry.created_at)}
                    </span>
                  </div>
                  {detailEntries.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      {detailEntries.map(([k, v]) => (
                        <li key={k}>
                          <span className="font-medium">{k.replace(/_/g, ' ')}:</span>{' '}
                          <span className="font-mono">
                            {Array.isArray(v) ? v.join(', ') : String(v)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export icons used by parent components for the side legend in scenarios.
export { Mail, MailOpen, UserCheck, Zap, Sparkles, Search, Inbox };
