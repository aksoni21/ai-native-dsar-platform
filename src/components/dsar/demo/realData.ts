import {
  getRequestById,
  getMatchesForRequest,
  getRecordById,
  getAuditTrailForRequest,
} from '@/lib/data';
import { daysUntil } from '@/lib/utils';
import type { AuditRowData } from '../shared/AuditRow';
import type { GatePhase } from './ApprovalGateCard';

export const DEFAULT_REQUEST_ID = 'REQ-002';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  right_to_know: 'Right to Know',
  deletion: 'Delete My Data',
  correction: 'Correction',
  opt_out: 'Opt Out',
};

const STATE_LAW: Record<string, string> = {
  CA: 'California · CCPA',
  VA: 'Virginia · VCDPA',
  TX: 'Texas · TDPSA',
  CO: 'Colorado · CPA',
  CT: 'Connecticut · CTDPA',
  FL: 'Florida',
};

export interface MatchRow {
  system: string;
  field: string;
  confidence: 'high' | 'low';
}

export interface DsarDemoViewModel {
  requestId: string;
  consumerName: string;
  consumerEmail: string | null;
  typeLabel: string;
  jurisdictionLabel: string;
  submittedLabel: string;
  identityVerified: boolean;
  slaDaysLeft: number;
  slaTone: 'success' | 'warn' | 'danger';
  sources: { name: string; count: number; ok: boolean }[];
  matches: MatchRow[];
  operatorMessage: string;
  reasoning: string;
  includedCount: number;
  reviewCount: number;
  proposedActionText: string;
  gateFacts: string[];
  gateTitle: string;
  gateDescription: string;
  executedSummary: string;
  initialPhase: GatePhase;
  audit: AuditRowData[];
}

function confidenceOf(score: number): 'high' | 'low' {
  return score >= 4 ? 'high' : 'low';
}

function fieldSummary(match: ReturnType<typeof getMatchesForRequest>[number]): string {
  if (match.human_notes) return match.human_notes;
  const matchedFields = Object.entries(match.field_scores)
    .filter(([, v]) => v === 1)
    .map(([k]) => k);
  return matchedFields.length ? `${matchedFields.join(', ')} matched` : 'partial field match';
}

const ACCENT = { bg: 'rgba(127,165,255,.15)', fg: '#7FA5FF' };
const SUCCESS = { bg: 'rgba(95,211,166,.15)', fg: '#5FD3A6' };
const WARN = { bg: 'rgba(224,166,75,.15)', fg: '#E0A64B' };
const DANGER = { bg: 'rgba(224,110,100,.15)', fg: '#E86E64' };

function auditTagColors(action: string): { bg: string; fg: string } {
  if (action === 'approved' || action === 'executed') return SUCCESS;
  if (action.includes('reject')) return DANGER;
  if (
    action.includes('reply') ||
    action.includes('outreach') ||
    action.includes('inbound') ||
    action.includes('outbound') ||
    action.includes('cascade') ||
    action.includes('confirmation') ||
    action.includes('clarification') ||
    action === 'rules_applied' ||
    action === 'disposition_planned' ||
    action === 'disposition_set'
  ) {
    return WARN;
  }
  return ACCENT;
}

function auditText(entry: ReturnType<typeof getAuditTrailForRequest>[number]): string {
  const d = entry.details as Record<string, unknown>;
  switch (entry.action) {
    case 'created':
      return `Request received · ${(d.source as string) ?? 'portal'}${d.consumer_verified ? ' · identity verified' : ''}`;
    case 'searched': {
      const n = (d.sources_searched as string[] | undefined)?.length ?? 0;
      return `search_sources() → ${n} systems, ${d.records_found ?? 0} matches`;
    }
    case 'scored':
      return `${d.matches_created ?? 0} matches scored — ${d.auto_included ?? 0} auto-included, ${d.agent_review_needed ?? 0} flagged for review`;
    case 'rules_applied':
      return `${(d.law as string) ?? 'compliance'} rules applied — ${d.deadline_days ?? '?'}-day deadline${d.exemptions_found ? `, ${d.exemptions_found} exemption(s)` : ''}`;
    case 'agent_resolved':
      return (d.reasoning_summary as string) ?? 'Agent resolved ambiguous matches';
    case 'decoded':
      return 'Coded fields decoded to human-readable values';
    case 'disposition_set':
    case 'disposition_planned':
      return `Disposition set: ${(d.disposition_set as string) ?? (d.disposition as string) ?? 'reviewed'}`;
    case 'report_generated':
    case 'compliance_report_generated':
      return 'Compliance report generated';
    case 'duplicate_detected':
      return 'Duplicate request detected and linked';
    case 'approved':
      return `Operator approved · ${(entry.actor as string) ?? 'you'}`;
    case 'executed':
      return 'Proposed action executed';
    default:
      return `${entry.actor}: ${entry.action.replace(/_/g, ' ')}`;
  }
}

export function buildDsarDemoViewModel(requestId: string): DsarDemoViewModel | null {
  const request = getRequestById(requestId);
  if (!request) return null;

  const matches = getMatchesForRequest(requestId);
  const auditEntries = getAuditTrailForRequest(requestId);

  const includedMatches = matches.filter((m) => m.match_decision !== 'excluded');
  const lowConfidenceCount = matches.filter((m) => confidenceOf(m.match_score) === 'low').length;

  const matchRows: MatchRow[] = matches.map((m) => {
    const record = getRecordById(m.record_id);
    return {
      system: record?.data_source ?? 'Unknown source',
      field: fieldSummary(m),
      confidence: confidenceOf(m.match_score),
    };
  });

  const searchedEntry = auditEntries.find((e) => e.action === 'searched');
  const searchedSources = (searchedEntry?.details.sources_searched as string[] | undefined) ?? [];
  const sources = searchedSources.length
    ? searchedSources.map((name) => {
        const count = matchRows.filter((m) => m.system === name).length;
        return { name, count, ok: count > 0 };
      })
    : Array.from(new Set(matchRows.map((m) => m.system))).map((name) => ({
        name,
        count: matchRows.filter((m) => m.system === name).length,
        ok: true,
      }));

  const resolvedEntry = auditEntries.find((e) => e.action === 'agent_resolved');
  const reasoning =
    (resolvedEntry?.details.reasoning_summary as string | undefined) ??
    matches.find((m) => m.agent_reasoning)?.agent_reasoning ??
    'All records matched on name, email, and phone with high confidence — no ambiguity to resolve.';

  const days = daysUntil(request.deadline_at);
  const slaTone: DsarDemoViewModel['slaTone'] = days < 0 ? 'danger' : days <= 7 ? 'warn' : 'success';

  const typeLabel = REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type;
  const actionVerb =
    request.request_type === 'deletion' ? 'delete' : request.request_type === 'correction' ? 'correct' : 'disclose';
  const operatorMessage =
    request.request_type === 'deletion'
      ? "Find all records we hold for this consumer and prepare them for deletion. Don't delete anything yet."
      : request.request_type === 'correction'
        ? "Find all records we hold for this consumer and prepare the correction. Don't apply anything yet."
        : "Find all records we hold for this consumer and prepare the disclosure. Don't send anything yet.";
  const gateTitle =
    request.request_type === 'deletion'
      ? 'Delete & confirm removal'
      : request.request_type === 'correction'
        ? 'Apply correction & confirm'
        : 'Compile & deliver disclosure';

  const gateDescription =
    request.request_type === 'deletion'
      ? `Delete ${includedMatches.length} matched record${includedMatches.length === 1 ? '' : 's'} and email a confirmation to the verified consumer.`
      : request.request_type === 'correction'
        ? `Apply the requested correction across ${includedMatches.length} matched record${includedMatches.length === 1 ? '' : 's'} and confirm by email.`
        : `Package ${includedMatches.length} matched record${includedMatches.length === 1 ? '' : 's'} and email a secure download link to the verified consumer.`;

  const executedSummary =
    request.request_type === 'deletion'
      ? 'Records deleted and confirmation emailed to the verified consumer. Logged to audit trail.'
      : request.request_type === 'correction'
        ? 'Correction applied across matched records and confirmation emailed. Logged to audit trail.'
        : 'Disclosure compiled and delivery link emailed to the verified consumer. Logged to audit trail.';

  const gateFacts = [
    `${includedMatches.length} record${includedMatches.length === 1 ? '' : 's'} · ${Array.from(new Set(matchRows.map((m) => m.system))).join(', ')}`,
    ...(lowConfidenceCount > 0 ? [`Excludes ${lowConfidenceCount} low-confidence match${lowConfidenceCount === 1 ? '' : 'es'}`] : []),
    'Delivery to verified email only',
  ];

  const proposedActionText = `I've drafted a ${typeLabel.toLowerCase()} action covering the ${includedMatches.length} matched record${includedMatches.length === 1 ? '' : 's'}. This is a proposed action — I won't ${actionVerb} anything until you approve.`;

  const initialPhase: GatePhase = request.status === 'approved' || request.status === 'completed' ? 'approved' : 'pending';

  const createdEntry = auditEntries.find((e) => e.action === 'created');
  const identityVerified = Boolean(createdEntry?.details.consumer_verified);

  return {
    requestId: request.id,
    consumerName: request.consumer_name,
    consumerEmail: request.consumer_email,
    typeLabel,
    jurisdictionLabel: STATE_LAW[request.consumer_state] ?? request.consumer_state,
    submittedLabel: new Date(request.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    identityVerified,
    slaDaysLeft: days,
    slaTone,
    sources,
    matches: matchRows,
    operatorMessage,
    reasoning,
    includedCount: includedMatches.length,
    reviewCount: lowConfidenceCount,
    proposedActionText,
    gateFacts,
    gateTitle,
    gateDescription,
    executedSummary,
    initialPhase,
    audit: auditEntries.map((entry) => {
      const colors = auditTagColors(entry.action);
      return {
        t: new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tag: entry.action,
        tagBg: colors.bg,
        tagFg: colors.fg,
        text: auditText(entry),
      };
    }),
  };
}
