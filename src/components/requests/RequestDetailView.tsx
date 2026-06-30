'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate, statusColor, requestTypeLabel, daysUntil } from '@/lib/utils';
import {
  getMatchesForRequest,
  getRecordById,
  getAuditTrailForRequest,
  getRepliesForRequest,
  getComplianceRules,
  getOwnershipsForConsumer,
} from '@/lib/data';
import type { CommunicationCase } from '@/types';
import {
  PIPELINE_STEPS,
  SCENARIOS,
  STAGE_VIEWS,
  viewIdForPipelineStep,
} from '@/lib/constants';
import { useRealPipeline } from '@/hooks/useRealPipeline';
import { useLiveRequest } from '@/hooks/useLiveRequest';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import type { StageViewId } from '@/types';

import DuplicateAlert from '@/components/requests/RequestDetail/DuplicateAlert';
import DedupStatusChip from '@/components/requests/RequestDetail/DedupStatusChip';
import PipelineRail, {
  type RailViewStatus,
} from '@/components/requests/RequestDetail/PipelineRail';
import FocusedStage from '@/components/requests/RequestDetail/FocusedStage';
import { Loader2, Sparkles } from 'lucide-react';

interface RequestDetailViewProps {
  id: string;
}

export default function RequestDetailView({ id }: RequestDetailViewProps) {
  const { request, loading: requestLoading } = useLiveRequest(id);
  const pipelineHook = useRealPipeline(id);
  const { currentStep, isRunning, completedSteps, startPipeline, resetPipeline } = pipelineHook;

  const scenario = useMemo(() => SCENARIOS.find((s) => s.requestId === id), [id]);

  const staticMatches = useMemo(
    () => (request ? getMatchesForRequest(id) : []),
    [id, request],
  );
  // Curated scenarios (REQ-001..016) live in src/data/matches.json. Anything
  // submitted via /intake (REQ-1xxxxx) doesn't, so fall through to the live
  // DB-backed endpoint that synthesizes matches from source-system probes.
  const isLive = !!request && staticMatches.length === 0;
  const live = useLiveMatches(id, isLive);
  const matches = isLive ? live.matches : staticMatches;

  const getRecord = useMemo(
    () =>
      isLive
        ? (rid: string): ReturnType<typeof getRecordById> =>
            live.recordsById.get(rid) ?? getRecordById(rid)
        : getRecordById,
    [isLive, live.recordsById],
  );

  const auditEntries = useMemo(
    () => (request ? getAuditTrailForRequest(id) : []),
    [id, request],
  );
  const replies = useMemo(() => (request ? getRepliesForRequest(id) : []), [id, request]);
  const rules = useMemo(
    () =>
      request ? getComplianceRules(request.consumer_state, request.request_type) ?? null : null,
    [request],
  );

  const recordsWithCodedFields = useMemo(
    () =>
      matches
        .map((m) => getRecord(m.record_id))
        .filter(
          (r): r is NonNullable<typeof r> =>
            r !== undefined && r.coded_fields && Object.keys(r.coded_fields).length > 0,
        ),
    [matches, getRecord],
  );

  const ambiguousMatches = useMemo(
    () => matches.filter((m) => m.match_decision === 'ambiguous'),
    [matches],
  );

  // VIN ownership data + Coordinator case lookup — these gate the new stage views.
  const ownerships = useMemo(
    () => (request ? getOwnershipsForConsumer(request.consumer_name) : []),
    [request],
  );
  const [consumerCoordinatorCase, setConsumerCoordinatorCase] = useState<CommunicationCase | null>(null);
  useEffect(() => {
    if (!request) {
      setConsumerCoordinatorCase(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/coordinator/case?requestId=${encodeURIComponent(request.id)}`)
      .then(async (res) => (res.ok ? ((await res.json()) as { case: CommunicationCase }) : null))
      .then((data) => {
        if (!cancelled) setConsumerCoordinatorCase(data?.case ?? null);
      })
      .catch(() => {
        if (!cancelled) setConsumerCoordinatorCase(null);
      });
    return () => {
      cancelled = true;
    };
  }, [request?.id]);
  const hasOrphanInvestigation = id === 'REQ-VIN-001';
  const isConsumerDsarReplyScenario =
    consumerCoordinatorCase?.application === 'consumer_dsar';

  // Per-view availability — gates rail clickability and informs the dimmed state.
  const viewAvailable = useMemo<Record<StageViewId, boolean>>(() => {
    return {
      search: true,
      score: matches.length > 0,
      agent_resolve: ambiguousMatches.length > 0,
      decode: recordsWithCodedFields.length > 0,
      rules: !!rules,
      disposition: request?.request_type === 'deletion' && matches.length > 0,
      report: !!request?.report_text,
      review: request?.status === 'pending_review',
      audit: auditEntries.length > 0,
      vin_search: ownerships.length > 0,
      orphan_list: hasOrphanInvestigation,
      coordinator_outreach: hasOrphanInvestigation,
      coordinator_reply: isConsumerDsarReplyScenario,
    };
  }, [
    matches.length,
    ambiguousMatches.length,
    recordsWithCodedFields.length,
    rules,
    request?.request_type,
    request?.report_text,
    request?.status,
    auditEntries.length,
    replies.length,
    ownerships.length,
    hasOrphanInvestigation,
    isConsumerDsarReplyScenario,
  ]);

  // Resolve the moment view, falling back to the first available view if the
  // configured moment isn't applicable to this request (defensive).
  const momentView: StageViewId = useMemo(() => {
    const configured = scenario?.momentViewId;
    if (configured && viewAvailable[configured]) return configured;
    const firstAvailable = STAGE_VIEWS.find((v) => viewAvailable[v.id])?.id;
    return firstAvailable ?? 'search';
  }, [scenario?.momentViewId, viewAvailable]);

  const [focusedView, setFocusedView] = useState<StageViewId>('search');

  // Snap to the Search view whenever the request changes — operators always
  // start at Search and drive forward from there.
  useEffect(() => {
    setFocusedView('search');
  }, [id]);

  // While running, follow the pipeline through corresponding views.
  useEffect(() => {
    if (!isRunning || currentStep < 0) return;
    const v = viewIdForPipelineStep(currentStep);
    if (v && viewAvailable[v]) setFocusedView(v);
  }, [currentStep, isRunning, viewAvailable]);

  // When a run completes, snap focus back to the scenario's moment so the
  // buyer's last visual is the moment, not the audit log.
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      setFocusedView(momentView);
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, momentView]);

  // Per-view status for the rail dot/icon.
  const viewStatuses = useMemo<Record<StageViewId, RailViewStatus>>(() => {
    const out = {} as Record<StageViewId, RailViewStatus>;
    for (const view of STAGE_VIEWS) {
      if (!viewAvailable[view.id]) {
        out[view.id] = 'unavailable';
        continue;
      }
      // Non-pipeline views are 'always' available — show a green check, treated
      // the same as 'completed' visually.
      if (view.pipelineStepIndex === null) {
        out[view.id] = 'always';
        continue;
      }
      const idx = view.pipelineStepIndex;
      if (completedSteps.has(idx)) {
        out[view.id] = 'completed';
      } else if (isRunning && currentStep === idx) {
        out[view.id] = 'running';
      } else if (currentStep < 0) {
        // Before any run, treat available views as completed (data already exists in the demo).
        out[view.id] = 'completed';
      } else {
        out[view.id] = 'pending';
      }
    }
    return out;
  }, [viewAvailable, completedSteps, currentStep, isRunning]);

  if (requestLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading {id}…</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Request not found.
      </div>
    );
  }

  const deadline = daysUntil(request.deadline_at);
  const hasRun = completedSteps.size > 0;
  const headline = scenario?.momentHeadline;

  // Search-strip animation pulses on first time the search step is in flight.
  const searchActive = isRunning && currentStep >= 2;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Request meta + moment strip */}
      <div className="flex-shrink-0 border-b border-border bg-background px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-base font-semibold tracking-tight">{request.id}</h1>
          <Badge className={cn('text-[11px]', statusColor(request.status))}>
            {request.status.replace(/_/g, ' ')}
          </Badge>
          <span className="text-sm font-medium text-foreground">{request.consumer_name}</span>
          <span className="text-xs text-muted-foreground">
            {requestTypeLabel(request.request_type)} · {request.consumer_state} ·{' '}
            {formatDate(request.created_at)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <DedupStatusChip
              duplicateOfId={request.duplicate_of_id}
              consumerEmail={request.consumer_email}
              consumerPhone={request.consumer_phone}
            />
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums',
                deadline <= 0
                  ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400'
                  : deadline <= 7
                    ? 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                    : 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400',
              )}
            >
              {deadline <= 0 ? 'Overdue' : `${deadline}d remaining`}
            </span>
          </div>
        </div>
        {headline && (
          <div className="mt-2 flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--info))]" />
            <p className="text-[13px] leading-snug text-foreground/80">{headline}</p>
          </div>
        )}
        {request.duplicate_of_id && (
          <div className="mt-2">
            <DuplicateAlert duplicateOfId={request.duplicate_of_id} />
          </div>
        )}
      </div>

      {/* Rail + focused stage */}
      <div className="flex flex-1 overflow-hidden">
        <PipelineRail
          focusedView={focusedView}
          onSelectView={setFocusedView}
          viewStatuses={viewStatuses}
          viewAvailable={viewAvailable}
          isRunning={isRunning}
          hasRun={hasRun}
          onRun={startPipeline}
          onReset={resetPipeline}
        />

        <main className="thin-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {isRunning && currentStep >= 0 && (
            <RunBanner currentStep={currentStep} totalSteps={PIPELINE_STEPS.length} />
          )}
          <FocusedStage
            view={focusedView}
            request={request}
            matches={matches}
            rules={rules}
            recordsWithCodedFields={recordsWithCodedFields}
            ambiguousMatches={ambiguousMatches}
            auditEntries={auditEntries}
            replies={replies}
            searchActive={searchActive}
            getRecord={getRecord}
            onSelectView={setFocusedView}
          />
        </main>
      </div>
    </div>
  );
}

function RunBanner({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const stepLabel = PIPELINE_STEPS[currentStep]?.label ?? '';
  const pct = Math.round(((currentStep + 1) / totalSteps) * 100);
  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info)/0.08)] px-3 py-2 text-xs text-foreground">
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--info))]" aria-hidden />
      <span className="font-medium">
        Step {currentStep + 1} of {totalSteps} · {stepLabel}
      </span>
      <div className="ml-auto h-1 w-32 overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-[hsl(var(--info))] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
