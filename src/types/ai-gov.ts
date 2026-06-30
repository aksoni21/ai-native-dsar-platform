export type Vertical = 'lending' | 'hr' | 'automotive';

export type JurisdictionCode = 'CO' | 'CA' | 'NY' | 'IL' | 'TX';
export type JurisdictionStatus = 'covered' | 'in_scope' | 'exempt' | 'edge';
export type HeatStatus = 'green' | 'yellow' | 'red' | 'na';

export interface DemoStep {
  slug: string;
  label: string;
  short: string;
  module: string;
}

export interface ProductModule {
  id: string;
  name: string;
  short: string;
  shown_in: string[]; // demo step slugs
  phase: 1 | 1.1 | 2;
}

export interface InboxItem {
  id: string;
  from: string;
  from_role?: string;
  subject: string;
  preview: string;
  received_at: string;
  priority: 'high' | 'normal' | 'low';
  is_ag_notice: boolean;
  opens_route?: string;
  body?: string;
}

export interface InboxData {
  vertical: Vertical;
  vertical_label: string;
  inbox_owner: string;
  inbox_owner_role: string;
  items: InboxItem[];
}

export interface ApplicantProfile {
  id: string;
  name: string;
  state: JurisdictionCode;
  product_or_role: string;
  decision: 'denied' | 'approved' | 'screened_out' | 'advanced';
  decision_at: string;
  model_id: string;
  vendor: string;
  confidence: number;
  factors: string[];
  amount?: number;
  fico_band?: string;
  ecoa_codes?: string[];
}

export interface ApplicantData {
  vertical: Vertical;
  profiles: ApplicantProfile[];
}

export type DiscoveryChannel =
  | 'saas_integration'
  | 'contract_scan'
  | 'bu_intake'
  | 'warehouse_scan'
  | 'model_registry';

export interface UseCase {
  id: string;
  name: string;
  system: string;
  owner: string;
  vendor: string;
  discovered_at: string;
  integration_source: string;
  discovery_channel: DiscoveryChannel;
  status: 'undocumented' | 'classified' | 'in_review';
  risk_tier: 'high' | 'med' | 'low';
  function: string;
  input_categories: string[];
}

export interface ContractFindingHighlight {
  term: string;
  kind: 'trigger' | 'void';
}

export interface ContractFinding {
  id: string;
  contract_name: string;
  vendor: string;
  effective_date: string;
  matched_use_case_id?: string;
  matched_use_case_name?: string;
  excerpt: string;
  highlights: ContractFindingHighlight[];
  matched_terms: string[];
  severity: 'standard' | 'critical';
  void_clause?: {
    citation: string;
    clause_title: string;
    explanation: string;
  };
}

export interface ContractScanData {
  vertical: Vertical;
  total_contracts: number;
  flagged_count: number;
  last_run_at: string;
  findings: ContractFinding[];
}

export interface InventoryData {
  vertical: Vertical;
  use_cases: UseCase[];
}

export interface JurisdictionRule {
  state: JurisdictionCode;
  status: JurisdictionStatus;
  basis_short: string;
  confidence: number;
}

export interface ClassificationRule {
  use_case_id: string;
  use_case_name: string;
  vendor: string;
  jurisdictions: JurisdictionRule[];
}

export interface VendorPacketSection {
  key:
    | 'intended_use'
    | 'training_data'
    | 'known_limitations'
    | 'risk_mitigation'
    | 'trade_secret_withheld';
  label: string;
  status: 'received' | 'pending' | 'redacted';
  file_size?: string;
  excerpt?: string;
}

export interface VendorDiff {
  triggered_at_offset_ms: number; // ms after page load
  summary: string;
  fields_changed: string[];
}

export interface VendorPacket {
  vendor_id: string;
  vendor_name: string;
  use_case_id: string;
  packet_version: string;
  last_updated: string;
  sections: VendorPacketSection[];
  pending_diff: VendorDiff | null;
}

export interface VendorPacketData {
  vertical: Vertical;
  packets: VendorPacket[];
}

export interface DisclosureContent {
  jurisdiction: JurisdictionCode;
  pre_decision: {
    headline: string;
    body: string;
    elements: string[];
  };
  adverse_outcome: {
    headline: string;
    body: string;
    appended_ai_line: string;
    federal_bridge?: string;
  };
}

export interface DisclosuresData {
  vertical: Vertical;
  by_jurisdiction: Record<JurisdictionCode, DisclosureContent | undefined>;
}

export interface AuditEntry {
  id: string;
  ts: string;
  actor: 'system' | 'reviewer' | 'vendor' | 'consumer' | 'developer';
  actor_name: string;
  action: string;
  detail: string;
  model_version?: string;
  admt_influence?: number;
  human_override?: boolean;
  disclosure_sent_id?: string;
}

export interface AuditData {
  vertical: Vertical;
  applicant_id: string;
  entries: AuditEntry[];
}

export interface StateHeatEntry {
  code: string;
  status: HeatStatus;
  label?: string;
  gaps: string[];
}

export interface HeatmapData {
  vertical: Vertical;
  active_jurisdictions: JurisdictionCode[];
  states: StateHeatEntry[];
}

export interface RoadmapItem {
  id: string;
  state: JurisdictionCode;
  severity: 'red' | 'yellow';
  title: string;
  description: string;
  effort: 'low' | 'med' | 'high';
  module_id: string;
}

export interface RoadmapData {
  vertical: Vertical;
  items: RoadmapItem[];
}

export interface ClassificationBasisResponse {
  use_case_id: string;
  vertical: Vertical;
  basis: string;
  confidence: number;
  citations: string[];
  generated_at: string;
  fallback?: boolean;
}

export interface ReviewerSummaryResponse {
  applicant_id: string;
  vertical: Vertical;
  summary: string;
  top_factors: { name: string; weight: number; value: string }[];
  reviewer_prompts: string[];
  generated_at: string;
  fallback?: boolean;
}
