"use client";

import { useState } from 'react';
import {
  FileText,
  Search,
  BarChart3,
  Brain,
  Key,
  Scale,
  ClipboardList,
  FileCheck,
  UserCheck,
  Zap,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AuditEntry } from '@/types';

// Locale-stable formatter — avoids the SSR/CSR timezone mismatch that fired the
// dev hydration error on the audit view.
function formatStableDateTime(iso: string): string {
  // Render as UTC consistently on both server and client.
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  request_created: FileText,
  dedup_check: Copy,
  search_started: Search,
  search_completed: Search,
  scoring_completed: BarChart3,
  agent_resolution: Brain,
  decode_completed: Key,
  rules_applied: Scale,
  disposition_set: ClipboardList,
  report_generated: FileCheck,
  review_submitted: UserCheck,
  approved: UserCheck,
  rejected: UserCheck,
  executed: Zap,
};

function formatDetailKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) {
    return value.length === 0 ? '—' : value.map((v) => String(v)).join(', ');
  }
  if (typeof value === 'number') return String(value);
  return String(value);
}

function actorColor(actor: string): string {
  if (actor === 'system') return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  if (actor === 'ai_agent' || actor === 'match_agent' || actor === 'disposition_agent' || actor === 'reply_agent')
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
}

interface AuditTrailProps {
  entries: AuditEntry[];
}

export default function AuditTrail({ entries }: AuditTrailProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card data-tour="audit-trail">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Audit Trail
          <Badge variant="secondary" className="ml-2">
            {entries.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {sorted.map((entry, index) => {
            const IconComponent = ACTION_ICONS[entry.action] || FileText;
            const isExpanded = expandedIds.has(entry.id);
            const hasDetails =
              entry.details && Object.keys(entry.details).length > 0;

            return (
              <div key={entry.id} className="relative flex gap-4">
                {/* Vertical line */}
                {index < sorted.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
                )}

                {/* Icon */}
                <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border bg-background">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <Badge className={cn('text-[10px]', actorColor(entry.actor))}>
                      {entry.actor}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatStableDateTime(entry.created_at)}
                    </span>
                  </div>

                  {/* Expandable details */}
                  {hasDetails && (
                    <button
                      onClick={() => toggleExpand(entry.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      Details
                    </button>
                  )}

                  {hasDetails && isExpanded && (
                    <ul className="mt-2 space-y-1 rounded-md bg-muted px-4 py-3 text-xs">
                      {Object.entries(entry.details).map(([key, value]) => (
                        <li key={key} className="list-disc marker:text-muted-foreground">
                          <span className="text-muted-foreground">{formatDetailKey(key)}:</span>{' '}
                          <span className="font-medium">{formatDetailValue(value)}</span>
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
