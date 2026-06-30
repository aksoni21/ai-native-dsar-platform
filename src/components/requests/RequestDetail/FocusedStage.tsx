'use client';

import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import SystemQueryStrip from './SystemQueryStrip';
import SearchResults from './SearchResults';
import { ScenarioExplanation } from './ScenarioExplanation';
import MatchScoreCard from './MatchScoreCard';
import AgentResolution from './AgentResolution';
import DecodedDataTable from './DecodedDataTable';
import RulesApplied from './RulesApplied';
import DispositionPlan from './DispositionPlan';
import ReportPreview from './ReportPreview';
import ApproveRejectPanel from './ApproveRejectPanel';
import AuditTrail from './AuditTrail';
import ConsumerReplies from './ConsumerReplies';
import VinKeyedSearchView from './VinKeyedSearchView';
import OrphanListView from './OrphanListView';
import OrphanInvestigationView from './OrphanInvestigationView';
import ConsumerReplyReviewView from './ConsumerReplyReviewView';
import { getRecordById } from '@/lib/data';
import type {
  AuditEntry,
  ComplianceRule,
  MatchData,
  RecordData,
  ReplyData,
  RequestData,
  StageViewId,
} from '@/types';

interface FocusedStageProps {
  view: StageViewId;
  request: RequestData;
  matches: MatchData[];
  rules: ComplianceRule | null;
  recordsWithCodedFields: RecordData[];
  ambiguousMatches: MatchData[];
  auditEntries: AuditEntry[];
  replies: ReplyData[];
  /** Whether the pipeline is mid-run — used to animate the search-results query strip. */
  searchActive: boolean;
  /** Record lookup. Falls back to static getRecordById; live requests inject a DB-backed map. */
  getRecord?: (id: string) => RecordData | undefined;
  /** Switch the focused rail view from inside a panel — e.g. clicking an orphan
   *  VIN row drills into the Coordinator investigation. */
  onSelectView?: (view: StageViewId) => void;
}

export default function FocusedStage({
  view,
  request,
  matches,
  rules,
  recordsWithCodedFields,
  ambiguousMatches,
  auditEntries,
  replies,
  searchActive,
  getRecord = getRecordById,
  onSelectView,
}: FocusedStageProps) {
  // Local UI state for which orphan VIN is being investigated. Selected from
  // the orphan list view; controls whether OrphanListView or
  // OrphanInvestigationView renders for the coordinator_outreach stage.
  const [selectedOrphanVin, setSelectedOrphanVin] = useState<string | null>('JT4567890ABCDEFGH');

  switch (view) {
    case 'search':
      return (
        <div className="space-y-4">
          <SystemQueryStrip matches={matches} getRecord={getRecord} active={searchActive} />
          {matches.length > 0 ? (
            <SearchResults matches={matches} getRecord={getRecord} />
          ) : (
            <EmptyView message="No records returned from any source." />
          )}
          <ScenarioExplanation requestId={request.id} />
        </div>
      );

    case 'score':
      if (matches.length === 0) return <EmptyView message="No matches to score." />;
      return (
        <div className="space-y-4">
          {matches.map((match) => {
            const record = getRecord(match.record_id);
            if (!record) return null;
            return <MatchScoreCard key={match.id} match={match} record={record} />;
          })}
        </div>
      );

    case 'agent_resolve':
      if (ambiguousMatches.length === 0)
        return (
          <EmptyView message="No ambiguous matches in this request — all records resolved automatically." />
        );
      return (
        <div className="space-y-4">
          {ambiguousMatches.map((match) => {
            const record = getRecord(match.record_id);
            if (!record) return null;
            return <AgentResolution key={match.id} match={match} record={record} />;
          })}
        </div>
      );

    case 'decode':
      if (recordsWithCodedFields.length === 0)
        return <EmptyView message="No coded fields in this request." />;
      return (
        <div className="space-y-4">
          {recordsWithCodedFields.map((record) => (
            <DecodedDataTable key={record.id} record={record} />
          ))}
        </div>
      );

    case 'rules':
      if (!rules)
        return <EmptyView message="No compliance rules registered for this state + type." />;
      return (
        <RulesApplied
          rules={rules}
          state={request.consumer_state}
          requestType={request.request_type}
        />
      );

    case 'disposition':
      if (request.request_type !== 'deletion' || matches.length === 0)
        return (
          <EmptyView message="Disposition only applies to deletion requests with matched records." />
        );
      return (
        <DispositionPlan
          matches={matches}
          getRecord={getRecord}
          complianceDispositionRules={rules?.disposition_rules}
        />
      );

    case 'report':
      if (!request.report_text)
        return <EmptyView message="The compliance report has not been generated yet." />;
      return <ReportPreview reportText={request.report_text} />;

    case 'review':
      if (request.status !== 'pending_review')
        return <EmptyView message="This request is not currently awaiting review." />;
      return <ApproveRejectPanel status={request.status} requestId={request.id} />;

    case 'audit':
      if (auditEntries.length === 0)
        return <EmptyView message="No audit entries recorded yet." />;
      return <AuditTrail entries={auditEntries} />;

    case 'vin_search':
      return <VinKeyedSearchView request={request} />;

    case 'orphan_list':
      return (
        <OrphanListView
          highlightVin={selectedOrphanVin ?? undefined}
          onSelect={(vin) => {
            setSelectedOrphanVin(vin);
            onSelectView?.('coordinator_outreach');
          }}
        />
      );

    case 'coordinator_outreach':
      if (!selectedOrphanVin) {
        return (
          <OrphanListView
            highlightVin={undefined}
            onSelect={(vin) => {
              setSelectedOrphanVin(vin);
              onSelectView?.('coordinator_outreach');
            }}
          />
        );
      }
      return (
        <OrphanInvestigationView
          request={request}
          vin={selectedOrphanVin}
          onBack={() => {
            setSelectedOrphanVin(null);
            onSelectView?.('orphan_list');
          }}
        />
      );

    case 'coordinator_reply':
      return <ConsumerReplyReviewView request={request} matches={matches} />;

    default:
      return <EmptyView message="Unknown stage." />;
  }
}

function EmptyView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <SearchIcon className="h-6 w-6 text-muted-foreground/60" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
