import type {
  RequestData,
  RecordData,
  MatchData,
  ReplyData,
  AuditEntry,
  CipherLegend,
  ComplianceRulesData,
  ComplianceRule,
  VehicleOwnership,
  VinKeyedRecord,
  OrphanVin,
} from '@/types';

import requests from '@/data/requests.json';
import records from '@/data/records.json';
import matches from '@/data/matches.json';
import replies from '@/data/replies.json';
import auditTrail from '@/data/audit_trail.json';
import cipherLegend from '@/data/cipher_legend.json';
import complianceRules from '@/data/compliance_rules.json';
import vinKeyed from '@/data/vin_keyed_records.json';
import orphanVins from '@/data/orphan_vins.json';

// Communication Coordinator data is loaded from comm_coordinator.* tables
// via src/lib/coordinator-db.ts. The corresponding JSON files in src/data/
// are kept on disk as a backfill source only — not imported here.

export const allRequests = requests as unknown as RequestData[];
export const allRecords = records as unknown as RecordData[];
export const allMatches = matches as unknown as MatchData[];
export const allReplies = replies as unknown as ReplyData[];
export const allAuditEntries = auditTrail as unknown as AuditEntry[];
export const allCipherLegend = cipherLegend as unknown as CipherLegend;
export const allComplianceRules = complianceRules as unknown as ComplianceRulesData;
export const allOwnerships = (vinKeyed as { ownerships: VehicleOwnership[] }).ownerships;
export const allVinKeyedRecords = (vinKeyed as { records: VinKeyedRecord[] }).records;
export const vinKeyedSummary = (vinKeyed as { summary_for_vin: Record<string, unknown> })
  .summary_for_vin;
export const allOrphanVins = orphanVins as unknown as OrphanVin[];

export function getRequestById(id: string): RequestData | undefined {
  return allRequests.find((r) => r.id === id);
}

export function getRequestIds(): string[] {
  return allRequests.map((r) => r.id);
}

export function getMatchesForRequest(requestId: string): MatchData[] {
  return allMatches.filter((m) => m.request_id === requestId);
}

export function getRecordById(id: string): RecordData | undefined {
  return allRecords.find((r) => r.id === id);
}

export function getAuditTrailForRequest(requestId: string): AuditEntry[] {
  return allAuditEntries
    .filter((a) => a.request_id === requestId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function getRepliesForRequest(requestId: string): ReplyData[] {
  return allReplies.filter((r) => r.request_id === requestId);
}

export function decodeField(fieldName: string, code: string): string | undefined {
  const field = allCipherLegend[fieldName];
  if (!field) return undefined;
  return field.codes[code];
}

// Intake form uses short request-type ids; compliance_rules.json uses the
// long-form regulatory names. Alias here so either resolves.
const REQUEST_TYPE_ALIASES: Record<string, string> = {
  correct: 'correction',
  delete: 'deletion',
  know: 'right_to_know',
};

export function getComplianceRules(
  state: string,
  requestType: string,
): ComplianceRule | undefined {
  const stateRules = allComplianceRules[state];
  if (!stateRules) return undefined;
  return stateRules[requestType] ?? stateRules[REQUEST_TYPE_ALIASES[requestType]];
}

export function getAtRiskRequests(daysThreshold = 7): RequestData[] {
  const now = new Date();
  return allRequests.filter((r) => {
    if (r.status === 'completed' || r.status === 'duplicate_closed') return false;
    const deadline = new Date(r.deadline_at);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= daysThreshold;
  });
}

export function getPendingReviews(): RequestData[] {
  return allRequests.filter((r) => r.status === 'pending_review');
}

// ─── VIN / Communication Coordinator helpers ─────────────────────────────────

export function getOwnershipsForConsumer(consumerName: string): VehicleOwnership[] {
  return allOwnerships.filter(
    (o) => o.consumer_name.toLowerCase() === consumerName.toLowerCase(),
  );
}

export function getVinKeyedRecordsInWindow(
  vin: string,
  startDate: string,
  endDate: string | null,
): VinKeyedRecord[] {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  return allVinKeyedRecords.filter(
    (r) =>
      r.vin === vin &&
      new Date(r.timestamp).getTime() >= start &&
      new Date(r.timestamp).getTime() <= end,
  );
}

export function getVinKeyedRecordsForVin(vin: string): VinKeyedRecord[] {
  return allVinKeyedRecords.filter((r) => r.vin === vin);
}

export function getOrphanVins(): OrphanVin[] {
  return allOrphanVins;
}

export function getOrphanVinByVin(vin: string): OrphanVin | undefined {
  return allOrphanVins.find((o) => o.vin === vin);
}

