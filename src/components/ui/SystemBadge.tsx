"use client";

import {
  Server,
  Cloud,
  Network,
  HardDrive,
  Database,
  Snowflake,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDataSourceMeta, getSystemTypeMeta } from '@/lib/data-sources';

const ICON_MAP: Record<string, LucideIcon> = {
  Server,
  Cloud,
  Network,
  HardDrive,
  Database,
  Snowflake,
};

interface SystemBadgeProps {
  sourceId: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function SystemBadge({
  sourceId,
  size = 'sm',
  showLabel = true,
  className,
}: SystemBadgeProps) {
  const meta = getDataSourceMeta(sourceId);
  const typeMeta = getSystemTypeMeta(meta.system_type);
  const Icon = ICON_MAP[typeMeta.iconName] || Database;

  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        sizeClass,
        typeMeta.badgeClass,
        className,
      )}
      title={typeMeta.label}
    >
      <Icon className={iconSize} />
      {showLabel && typeMeta.label}
    </span>
  );
}
