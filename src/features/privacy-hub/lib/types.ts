// Privacy Hub-local types. Intentionally NOT imported from src/types/index.ts
// so the Privacy Hub feature can be deleted by removing this folder + its
// two route entrypoints, with zero impact on the DSAR demo.

// ── Domain types (state laws + AI provider policies) ──────────────────────

export interface StateLaw {
  state: string;
  state_full: string;
  law_name: string;
  law_abbreviation: string;
  effective_date: string;
  enforcement_date: string;
  dsar_deadline_days: number;
  extension_days: number | null;
  consumer_rights: string[];
  private_right_of_action: boolean;
  enforcement_body: string;
  business_thresholds: {
    annual_revenue: string | null;
    records_count: number | null;
    revenue_from_data: string | null;
  };
  sensitive_data_defined: boolean;
  opt_out_sale: boolean;
  opt_out_targeted_ads: boolean;
  opt_out_profiling: boolean;
  gpc_required: boolean;
  cure_period_days: number | null;
  status: string;
  source_url: string | null;
}

export type TrainingPolicy = 'yes' | 'no' | 'opt_out' | 'conditional' | 'n_a';

export type ProductTier =
  | 'api'
  | 'consumer_free'
  | 'consumer_paid'
  | 'team'
  | 'enterprise'
  | 'cloud_hosted'
  | 'self_hosted';

export interface PolicySnapshot {
  trains_on_input: TrainingPolicy;
  trains_on_input_detail: string;
  trains_on_output: TrainingPolicy;
  input_retention_days: number | null;
  output_retention_days: number | null;
  retention_detail: string;
  zero_retention_available: boolean;
  zero_retention_detail: string | null;
  abuse_monitoring: boolean;
  abuse_monitoring_detail: string;
  human_review_possible: boolean;
  human_review_detail: string;
  dpa_available: boolean;
  dpa_url: string | null;
  dpa_detail: string;
  data_location: string[];
  data_region_choice: boolean;
  data_location_detail: string;
  sub_processors_disclosed: boolean;
  sub_processors_url: string | null;
  deletion_on_request: boolean;
  deletion_detail: string;
  notes: string | null;
}

export interface SourceURL {
  label: string;
  url: string;
}

export interface LLMProduct {
  id: string;
  name: string;
  tier: ProductTier;
  governing_terms: string;
  governing_terms_url: string;
  policy: PolicySnapshot;
  source_urls: SourceURL[];
  last_verified: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  logo_icon: string;
  website: string;
  products: LLMProduct[];
}

export interface LLMPrivacyData {
  last_updated: string;
  providers: LLMProvider[];
}

// ── Chat / agent types (local copies — wire format mirrors DSAR but the
// two are deliberately decoupled so they can drift independently) ─────────

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  status: 'calling' | 'done' | 'error';
}
