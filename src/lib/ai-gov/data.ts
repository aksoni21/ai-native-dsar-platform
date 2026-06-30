import inboxRaw from '@/data/ai-gov/inbox.json';
import applicantRaw from '@/data/ai-gov/applicant_profile.json';
import inventoryRaw from '@/data/ai-gov/inventory.json';
import classificationRaw from '@/data/ai-gov/classification_rules.json';
import vendorRaw from '@/data/ai-gov/vendor_packets.json';
import disclosuresRaw from '@/data/ai-gov/disclosures.json';
import auditRaw from '@/data/ai-gov/audit_trail.json';
import heatmapRaw from '@/data/ai-gov/state_heatmap.json';
import roadmapRaw from '@/data/ai-gov/roadmap.json';
import contractScanRaw from '@/data/ai-gov/contract_scan.json';
import classificationFallbackRaw from '@/data/ai-gov/fallbacks/classification_basis.json';
import reviewerFallbackRaw from '@/data/ai-gov/fallbacks/reviewer_summary.json';

import type {
  Vertical,
  InboxData,
  ApplicantData,
  InventoryData,
  ClassificationRule,
  VendorPacketData,
  DisclosuresData,
  AuditData,
  HeatmapData,
  RoadmapData,
  ContractScanData,
} from '@/types/ai-gov';

type ByVertical<T> = Record<Vertical, T>;

const inbox = inboxRaw as unknown as ByVertical<InboxData>;
const applicants = applicantRaw as unknown as ByVertical<ApplicantData>;
const inventory = inventoryRaw as unknown as ByVertical<InventoryData>;
const classification = classificationRaw as unknown as ByVertical<{
  vertical: Vertical;
  rules: ClassificationRule[];
}>;
const vendorPackets = vendorRaw as unknown as ByVertical<VendorPacketData>;
const disclosures = disclosuresRaw as unknown as ByVertical<DisclosuresData>;
const audit = auditRaw as unknown as ByVertical<AuditData>;
const heatmap = heatmapRaw as unknown as ByVertical<HeatmapData>;
const roadmap = roadmapRaw as unknown as ByVertical<RoadmapData>;
const contractScan = contractScanRaw as unknown as ByVertical<ContractScanData>;

export function getInbox(v: Vertical): InboxData {
  return inbox[v];
}

export function getPrimaryApplicant(v: Vertical) {
  return applicants[v].profiles[0];
}

export function getApplicants(v: Vertical) {
  return applicants[v].profiles;
}

export function getApplicantById(v: Vertical, id: string) {
  return applicants[v].profiles.find((p) => p.id === id);
}

export function getInventory(v: Vertical) {
  return inventory[v].use_cases;
}

export function getClassificationRules(v: Vertical) {
  return classification[v].rules;
}

export function getClassificationForUseCase(v: Vertical, useCaseId: string) {
  return classification[v].rules.find((r) => r.use_case_id === useCaseId);
}

export function getVendorPackets(v: Vertical) {
  return vendorPackets[v].packets;
}

export function getDisclosures(v: Vertical) {
  return disclosures[v];
}

export function getAuditTrail(v: Vertical) {
  return audit[v];
}

export function getHeatmap(v: Vertical) {
  return heatmap[v];
}

export function getRoadmap(v: Vertical) {
  return roadmap[v];
}

export function getContractScan(v: Vertical) {
  return contractScan[v];
}

export function getClassificationFallback(useCaseId: string) {
  const map = classificationFallbackRaw as Record<
    string,
    { basis: string; confidence: number; citations: string[] }
  >;
  return map[useCaseId];
}

export function getReviewerFallback(applicantId: string) {
  const map = reviewerFallbackRaw as Record<
    string,
    {
      summary: string;
      top_factors: { name: string; weight: number; value: string }[];
      reviewer_prompts: string[];
    }
  >;
  return map[applicantId];
}
