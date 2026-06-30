"use client";

import { useState } from 'react';
import { Brain, Check, Edit, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MatchData, RecordData } from '@/types';

interface AgentResolutionProps {
  match: MatchData;
  record: RecordData;
}

type Decision = 'approved' | 'overridden' | 'escalated' | null;

export default function AgentResolution({
  match,
  record,
}: AgentResolutionProps) {
  const [decision, setDecision] = useState<Decision>(null);

  return (
    <Card data-tour="agent-resolution">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          AI ID Resolution Required
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ambiguous match for {record.first_name} {record.last_name} (score:{' '}
          {match.match_score})
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI reasoning */}
        {match.agent_reasoning && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Agent Reasoning
              </span>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
              {match.agent_reasoning}
            </p>
          </div>
        )}

        {/* Decision area */}
        {decision ? (
          <div
            className={cn(
              'rounded-lg border p-4 text-center',
              decision === 'approved' &&
                'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950',
              decision === 'overridden' &&
                'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950',
              decision === 'escalated' &&
                'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
            )}
          >
            <Badge
              className={cn(
                decision === 'approved' &&
                  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                decision === 'overridden' &&
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                decision === 'escalated' &&
                  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              )}
            >
              {decision === 'approved' && 'Approved'}
              {decision === 'overridden' && 'Overridden'}
              {decision === 'escalated' && 'Escalated'}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Decision recorded for this match.
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setDecision('approved')}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950"
              onClick={() => setDecision('overridden')}
            >
              <Edit className="mr-1.5 h-4 w-4" />
              Override
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-400 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => setDecision('escalated')}
            >
              <Flag className="mr-1.5 h-4 w-4" />
              Escalate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
