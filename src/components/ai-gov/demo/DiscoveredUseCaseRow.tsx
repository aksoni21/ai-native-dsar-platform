'use client';

import Link from 'next/link';
import { Sparkles, AlertCircle, CheckCircle2, Clock, Plug, FileSearch, ClipboardList, Database, Package } from 'lucide-react';
import type { UseCase, DiscoveryChannel } from '@/types/ai-gov';
import { Badge } from '@/components/ai-gov/ui/badge';
import { cn, timeAgo } from '@/lib/ai-gov/utils';
import { DISCOVERY_CHANNEL_SHORT, ROUTE_PREFIX } from '@/lib/ai-gov/constants';

const STATUS_META: Record<UseCase['status'], { label: string; icon: typeof Sparkles; cls: string }> = {
  undocumented: { label: 'Newly discovered', icon: Sparkles, cls: 'text-accent' },
  in_review: { label: 'In review', icon: Clock, cls: 'text-warning' },
  classified: { label: 'Classified', icon: CheckCircle2, cls: 'text-success' },
};

const RISK_VARIANT: Record<UseCase['risk_tier'], 'destructive' | 'warning' | 'secondary'> = {
  high: 'destructive',
  med: 'warning',
  low: 'secondary',
};

const CHANNEL_ICON: Record<DiscoveryChannel, typeof Plug> = {
  saas_integration: Plug,
  contract_scan: FileSearch,
  bu_intake: ClipboardList,
  warehouse_scan: Database,
  model_registry: Package,
};

interface Props {
  useCase: UseCase;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function DiscoveredUseCaseRow({ useCase, selected, onSelect }: Props) {
  const meta = STATUS_META[useCase.status];
  const Icon = meta.icon;
  const ChannelIcon = CHANNEL_ICON[useCase.discovery_channel];

  return (
    <button
      type="button"
      onClick={() => onSelect?.(useCase.id)}
      className={cn(
        'w-full text-left rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/40',
        selected && 'border-primary ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-4 w-4 mt-1 shrink-0', meta.cls)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">{useCase.name}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] font-normal gap-1 px-1.5 py-0.5"
                title={`Discovered via ${useCase.integration_source}`}
              >
                <ChannelIcon className="h-3 w-3" />
                {DISCOVERY_CHANNEL_SHORT[useCase.discovery_channel]}
              </Badge>
              <Badge variant={RISK_VARIANT[useCase.risk_tier]} className="uppercase tracking-wider">
                {useCase.risk_tier} risk
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {useCase.vendor} · {useCase.system} · owner {useCase.owner}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span className={cn('font-medium', meta.cls)}>{meta.label}</span> · via {useCase.integration_source} · {timeAgo(useCase.discovered_at)}
          </div>
        </div>
      </div>
      {useCase.status === 'undocumented' && (
        <div className="mt-2.5 flex items-center gap-2 text-xs rounded-md bg-accent/10 border border-accent/30 px-2.5 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-foreground">
            Not in the prior inventory.
          </span>
          <Link
            href={`${ROUTE_PREFIX}/classification`}
            className="ml-auto text-[11px] underline underline-offset-2 text-accent shrink-0"
          >
            Classify →
          </Link>
        </div>
      )}
    </button>
  );
}
