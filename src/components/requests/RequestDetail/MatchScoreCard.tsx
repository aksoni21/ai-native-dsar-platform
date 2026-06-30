import { Check, X, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemBadge } from '@/components/ui/SystemBadge';
import { cn } from '@/lib/utils';
import type { MatchData, RecordData } from '@/types';

interface MatchScoreCardProps {
  match: MatchData;
  record: RecordData;
}

function scoreColor(score: number): string {
  if (score >= 3) return 'text-green-600 dark:text-green-400';
  if (score === 2) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-500 dark:text-gray-400';
}

function scoreBgColor(score: number): string {
  if (score >= 3)
    return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
  if (score === 2)
    return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
  return 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700';
}

const FIELD_LABELS: { key: keyof MatchData['field_scores']; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'address', label: 'Address' },
];

export default function MatchScoreCard({ match, record }: MatchScoreCardProps) {
  return (
    <Card data-tour="match-scores">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {record.first_name} {record.last_name}
          </CardTitle>
          <Badge
            className={cn(
              'text-xs',
              match.match_decision === 'auto_included' || match.match_decision === 'agent_included'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {match.match_decision.replace('_', ' ')}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SystemBadge sourceId={record.data_source} />
          <p className="text-xs text-muted-foreground">
            {record.data_source} &middot; {record.record_type}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Large score */}
        <div
          className={cn(
            'flex items-center justify-center rounded-lg border-2 py-4',
            scoreBgColor(match.match_score)
          )}
        >
          <span
            className={cn('text-4xl font-bold', scoreColor(match.match_score))}
          >
            {match.match_score}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">/5</span>
        </div>

        {/* Field breakdown */}
        <div className="grid grid-cols-5 gap-2">
          {FIELD_LABELS.map(({ key, label }) => {
            const val = match.field_scores[key];
            const passed = val >= 1;

            return (
              <div key={key} className="flex flex-col items-center gap-1">
                {passed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
                <span className="text-[11px] text-muted-foreground">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Agent reasoning */}
        {match.agent_reasoning && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                AI Reasoning
              </span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {match.agent_reasoning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
