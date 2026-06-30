import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ComplianceRule } from '@/types';

interface RulesAppliedProps {
  rules: ComplianceRule;
  state: string;
  requestType: string;
}

export default function RulesApplied({
  rules,
  state,
  requestType,
}: RulesAppliedProps) {
  return (
    <Card data-tour="rules-applied">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5" />
          Compliance Rules Applied
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          State: <span className="font-medium">{state}</span> &middot; Type:{' '}
          <span className="font-medium capitalize">
            {requestType.replace(/_/g, ' ')}
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Deadlines */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Deadlines</h4>
          <div className="flex gap-4">
            <div className="rounded-md border px-3 py-2">
              <p className="text-2xl font-bold">{rules.deadline_days}</p>
              <p className="text-xs text-muted-foreground">Deadline (days)</p>
            </div>
            {rules.extension_days !== null && (
              <div className="rounded-md border px-3 py-2">
                <p className="text-2xl font-bold">{rules.extension_days}</p>
                <p className="text-xs text-muted-foreground">
                  Extension (days)
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Required Disclosures */}
        {rules.required_disclosures.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              Required Disclosures
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {rules.required_disclosures.map((disclosure) => (
                <Badge key={disclosure} variant="secondary" className="text-xs">
                  {disclosure}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Required Actions */}
        {rules.required_actions.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Required Actions</h4>
            <div className="flex flex-wrap gap-1.5">
              {rules.required_actions.map((action) => (
                <Badge
                  key={action}
                  className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs"
                >
                  {action}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Exceptions */}
        {rules.exceptions.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Exceptions</h4>
            <div className="flex flex-wrap gap-1.5">
              {rules.exceptions.map((exception) => (
                <Badge
                  key={exception}
                  variant="outline"
                  className="text-xs border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400"
                >
                  {exception}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Vendor Notifications */}
        {rules.vendor_notifications.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              Vendor Notifications Required
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {rules.vendor_notifications.map((notification) => (
                <Badge
                  key={notification}
                  variant="outline"
                  className="text-xs border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400"
                >
                  {notification}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
