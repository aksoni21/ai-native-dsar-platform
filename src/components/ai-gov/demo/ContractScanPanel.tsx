'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Link2,
  ShieldAlert,
} from 'lucide-react';
import type { ContractFinding, ContractScanData } from '@/types/ai-gov';
import { Card, CardContent } from '@/components/ai-gov/ui/card';
import { Badge } from '@/components/ai-gov/ui/badge';
import { Button } from '@/components/ai-gov/ui/button';
import { cn, formatDate, timeAgo } from '@/lib/ai-gov/utils';

interface Props {
  data: ContractScanData;
  onFindingClick?: (useCaseId: string) => void;
}

export function ContractScanPanel({ data, onFindingClick }: Props) {
  const criticalCount = data.findings.filter((f) => f.severity === 'critical').length;
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className={cn(criticalCount > 0 && 'border-destructive/40')}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-t-lg"
      >
        <div
          className={cn(
            'h-9 w-9 rounded-md flex items-center justify-center shrink-0',
            criticalCount > 0
              ? 'bg-destructive/10 text-destructive'
              : 'bg-accent/10 text-accent'
          )}
        >
          <FileSearch className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium text-sm">Vendor contract scan</div>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <ShieldAlert className="h-3 w-3" />
                {criticalCount} critical
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Scanned {data.total_contracts} active vendor contracts ·{' '}
            <span className="text-foreground font-medium">{data.flagged_count} flagged</span> ·
            last run {timeAgo(data.last_run_at)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 hidden sm:inline-flex"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <RefreshCcw className="h-3 w-3 mr-1" />
          Re-run scan
        </Button>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-3 pt-0 pb-4">
              {data.findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  onClick={onFindingClick}
                />
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function FindingCard({
  finding,
  onClick,
}: {
  finding: ContractFinding;
  onClick?: (useCaseId: string) => void;
}) {
  const isCritical = finding.severity === 'critical';

  return (
    <div
      className={cn(
        'rounded-md border bg-card',
        isCritical ? 'border-destructive/30 bg-destructive/[0.02]' : ''
      )}
    >
      <div className="px-3.5 py-2.5 border-b border-border/40 flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-medium flex items-center gap-2">
            {isCritical && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
            <span className="truncate">{finding.contract_name}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {finding.vendor} · effective {formatDate(finding.effective_date)}
          </div>
        </div>
        {finding.matched_use_case_id && finding.matched_use_case_name && (
          <button
            type="button"
            onClick={() => onClick?.(finding.matched_use_case_id!)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] hover:bg-muted transition-colors shrink-0"
            title="Highlight matched use case below"
          >
            <Link2 className="h-3 w-3 text-muted-foreground" />
            <span className="truncate max-w-[180px]">{finding.matched_use_case_name}</span>
          </button>
        )}
      </div>

      <div className="px-3.5 py-3 space-y-2.5">
        <blockquote className="text-xs leading-relaxed text-foreground/85 border-l-2 border-border pl-3 font-serif italic">
          <HighlightedExcerpt
            excerpt={finding.excerpt}
            highlights={finding.highlights}
          />
        </blockquote>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
            Why flagged
          </span>
          {finding.matched_terms.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] font-mono">
              {t}
            </Badge>
          ))}
        </div>

        {finding.void_clause && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
              Likely void under {finding.void_clause.citation}
            </div>
            <div className="text-[11px] mt-1 text-foreground/90">
              <span className="font-mono">{finding.void_clause.clause_title}</span> —{' '}
              {finding.void_clause.explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedExcerpt({
  excerpt,
  highlights,
}: {
  excerpt: string;
  highlights: { term: string; kind: 'trigger' | 'void' }[];
}) {
  if (highlights.length === 0) return <>{excerpt}</>;

  type Segment = { text: string; kind: 'trigger' | 'void' | null };
  let segments: Segment[] = [{ text: excerpt, kind: null }];

  for (const h of highlights) {
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.kind !== null) {
        next.push(seg);
        continue;
      }
      const idx = seg.text.indexOf(h.term);
      if (idx === -1) {
        next.push(seg);
        continue;
      }
      if (idx > 0) next.push({ text: seg.text.slice(0, idx), kind: null });
      next.push({ text: h.term, kind: h.kind });
      const rest = seg.text.slice(idx + h.term.length);
      if (rest) next.push({ text: rest, kind: null });
    }
    segments = next;
  }

  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'void' ? (
          <mark
            key={i}
            className="bg-destructive/20 text-destructive-foreground px-0.5 rounded-sm not-italic font-medium"
            style={{ color: 'inherit' }}
          >
            {s.text}
          </mark>
        ) : s.kind === 'trigger' ? (
          <mark
            key={i}
            className="bg-accent/25 px-0.5 rounded-sm not-italic font-medium"
            style={{ color: 'inherit' }}
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}
