"use client";

import { useState } from 'react';
import { Check, X, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ApproveRejectPanelProps {
  status: string;
  requestId: string;
}

type ReviewDecision = 'approved' | 'rejected' | null;

export default function ApproveRejectPanel({
  status,
  requestId,
}: ApproveRejectPanelProps) {
  const [decision, setDecision] = useState<ReviewDecision>(null);
  const [notes, setNotes] = useState('');

  if (status !== 'pending_review') return null;

  return (
    <Card data-tour="approve-reject-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="h-5 w-5" />
           Review Required
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Request {requestId} is awaiting your review and approval.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {decision ? (
          <div
            className={cn(
              'rounded-lg border p-6 text-center',
              decision === 'approved'
                ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
            )}
          >
            <Badge
              className={cn(
                'text-sm px-3 py-1',
                decision === 'approved'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              )}
            >
              {decision === 'approved' ? 'Approved' : 'Rejected'}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Your decision has been recorded.
            </p>
            {notes && (
              <p className="mt-1 text-xs text-muted-foreground">
                Notes: {notes}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Notes */}
            <div>
              <label
                htmlFor="review-notes"
                className="mb-1.5 block text-sm font-medium"
              >
                Review Notes
              </label>
              <textarea
                id="review-notes"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={3}
                placeholder="Add any notes about your review decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-base"
                onClick={() => setDecision('approved')}
              >
                <Check className="mr-2 h-5 w-5" />
                Approve
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 text-base"
                onClick={() => setDecision('rejected')}
              >
                <X className="mr-2 h-5 w-5" />
                Reject
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
