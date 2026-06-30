"use client";

import { useState } from 'react';
import { ClipboardList, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SystemBadge } from '@/components/ui/SystemBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { MatchData, RecordData, ComplianceRule } from '@/types';

interface DispositionPlanProps {
  matches: MatchData[];
  getRecord: (id: string) => RecordData | undefined;
  complianceDispositionRules?: ComplianceRule['disposition_rules'];
}

function dispositionBadgeClass(disposition: string | null): string {
  switch (disposition) {
    case 'full_delete':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'mask_anonymize':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'retain_exempt':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function dispositionLabel(disposition: string | null): string {
  switch (disposition) {
    case 'full_delete':
      return 'Full Delete';
    case 'mask_anonymize':
      return 'Mask / Anonymize';
    case 'retain_exempt':
      return 'Retain (Exempt)';
    default:
      return 'Pending';
  }
}

export default function DispositionPlan({
  matches,
  getRecord,
  complianceDispositionRules,
}: DispositionPlanProps) {
  const [approved, setApproved] = useState(false);

  const matchesWithRecords = matches
    .map((m) => ({ match: m, record: getRecord(m.record_id) }))
    .filter(
      (item): item is { match: MatchData; record: RecordData } =>
        item.record !== undefined
    );

  return (
    <Card data-tour="disposition-plan">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Disposition Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Reasoning</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matchesWithRecords.map(({ match, record }) => (
              <TableRow key={match.id}>
                <TableCell className="font-medium">
                  {record.first_name} {record.last_name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <SystemBadge sourceId={record.data_source} />
                    <span className="text-xs text-muted-foreground">
                      {record.data_source}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(dispositionBadgeClass(match.disposition))}>
                    {dispositionLabel(match.disposition)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">
                  {match.agent_reasoning || 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {/* Compliance Rule Reference */}
      {complianceDispositionRules && complianceDispositionRules.length > 0 && (
        <CardContent className="pt-0">
          <div className="rounded-md border-2 border-dashed border-muted-foreground/25 p-4">
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
              Compliance Rule Reference
            </h4>
            <div className="space-y-3">
              {complianceDispositionRules.map((rule) => (
                <div key={rule.record_type} className="flex items-start gap-3 text-sm">
                  <Badge className={cn('shrink-0', dispositionBadgeClass(rule.disposition))}>
                    {dispositionLabel(rule.disposition)}
                  </Badge>
                  <div>
                    <span className="font-medium">{rule.record_type.replace(/_/g, ' ')}</span>
                    {rule.exemption && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (exemption: {rule.exemption.replace(/_/g, ' ')})
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">{rule.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="gap-2">
        {approved ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">
              Disposition plan approved
            </span>
          </div>
        ) : (
          <>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setApproved(true)}
            >
              Approve All
            </Button>
            <Button variant="outline">Edit Individual</Button>
            <Button variant="destructive">Reject</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
