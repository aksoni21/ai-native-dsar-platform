export interface RequestData {
  id: string;
  consumer_name: string;
  consumer_email: string | null;
  consumer_phone: string | null;
  consumer_state: string;
  request_type: string;
  status: string;
  duplicate_of_id: string | null;
  deadline_at: string;
  report_text: string | null;
  created_at: string;
  demo_scenario: string;
}

export interface RecordData {
  id: string;
  data_source: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  state: string;
  address: string | null;
  record_type: string;
  coded_fields: Record<string, string>;
  raw_data: Record<string, unknown>;
}

export interface MatchData {
  id: string;
  request_id: string;
  record_id: string;
  match_score: number;
  field_scores: {
    name: number;
    email: number;
    phone: number;
    state: number;
    address: number;
  };
  match_decision: string;
  disposition: string | null;
  disposition_source: string | null;
  agent_reasoning: string | null;
  human_notes: string | null;
  created_at: string;
}

export interface ReplyData {
  id: string;
  request_id: string;
  reply_text: string;
  category: string;
  agent_summary: string;
  extracted_info: Record<string, string>;
  suggested_action: string;
  draft_response: string;
  status: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  request_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CipherLegend {
  [fieldName: string]: {
    label: string;
    codes: Record<string, string>;
  };
}

export interface ComplianceRule {
  deadline_days: number;
  extension_days: number | null;
  required_disclosures: string[];
  required_actions: string[];
  exceptions: string[];
  vendor_notifications: string[];
  disposition_rules: {
    record_type: string;
    disposition: string;
    exemption: string | null;
    mask_fields: string[];
    retain_fields: string[];
    reasoning: string;
  }[];
}

export interface ComplianceRulesData {
  [state: string]: {
    [requestType: string]: ComplianceRule;
  };
}

export interface PipelineStep {
  id: string;
  label: string;
  description: string;
  icon: string;
}

// ─── Post-approval execution pipeline ─────────────────────────────────────────
// Manifest returned by the `execute_post_approval_pipeline` tool. Drives the
// PipelineExecutionBubble UI. The tool itself is a no-op for the demo — these
// shapes describe what a real pipeline run would emit so the UI matches the
// Office365 / SendGrid story we tell the room.

export type PipelineActionKind =
  | 'generate_pptx'
  | 'save_to_documents'
  | 'send_email'
  | 'send_communication_outbound'
  | 'apply_attribution';

export interface PipelineArtifact {
  type: 'pptx';
  request_id: string;
  consumer_name: string;
  filename: string;
  path: string;
  size_bytes: number;
}

export interface PipelineEmail {
  to: string;
  to_name: string;
  subject: string;
  body_preview: string;
  message_id: string;
  attachments: string[];
}

export interface PipelineManifest {
  pipeline_id: string;
  completed_at: string;
  authorization_quote: string;
  artifacts: PipelineArtifact[];
  saved_to_documents: boolean;
  email: PipelineEmail | null;
}

// Agent chat types
export type LayoutMode = 'split' | 'full-ui' | 'full-copilot';

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
  /**
   * For sub-agent meta-tools, the names of internal tools fired so far,
   * streamed live as the sub-agent's loop runs. Final list lands in
   * (result as { toolsUsed }).toolsUsed when status flips to 'done'.
   */
  liveToolsUsed?: string[];
}

export interface ScenarioConfig {
  id: number;
  label: string;
  shortLabel: string;
  requestId: string;
  description: string;
  proactiveMessage: string;
  suggestedQueries: string[];
  /** Which view the rail should land on when the scenario opens or after a Run completes. */
  momentViewId: StageViewId;
  /** Single-sentence header that earns the strip above the focused stage. */
  momentHeadline: string;
}

export type StageViewId =
  | 'search'
  | 'score'
  | 'agent_resolve'
  | 'decode'
  | 'rules'
  | 'disposition'
  | 'report'
  | 'review'
  | 'audit'
  | 'vin_search'
  | 'orphan_list'
  | 'coordinator_outreach'
  | 'coordinator_reply';

// ─── VIN-keyed records and ownership (Scenario A: Orphan VIN) ────────────────
export interface VehicleOwnership {
  vin: string;
  vehicle: string;
  start_date: string; // ISO date
  end_date: string | null; // null if currently owned
  source_system: string;
  consumer_name: string;
  /** Owner of the VIN before the consumer's window — records before start_date belong to this person. */
  previous_owner?: string | null;
  /** Owner of the VIN after the consumer's window — records after end_date belong to this person. */
  next_owner?: string | null;
}

export interface VinKeyedRecord {
  id: string;
  vin: string;
  source: string; // e.g. 'Telematics' | 'ManufacturingQA' | 'RecallCampaigns' | 'IndependentShopService'
  timestamp: string;
  in_window: boolean;
  exclusion_reason?: string;
  type?: string; // record-type-specific tag
  payload: Record<string, unknown>;
}

export interface OrphanVin {
  vin: string;
  category: 'pipeline_gap';
  category_signals: string[];
  record_count: number;
  source_systems: string[];
  first_seen: string;
  last_attribution_date: string | null;
  status: 'open' | 'investigating' | 'resolved';
  resolved_to_consumer_name?: string;
  resolved_at?: string;
  likely_cause: string;
}

// ─── Communication Coordinator (shared infrastructure) ────────────────────────
// Mirrors the schema in compliance-agentic-system/.../communication_coordinator.md §9.

export type CoordinatorApplication = 'orphan_vin' | 'consumer_dsar' | 'operator_inquiry';

export type CoordinatorCaseState =
  | 'drafted'
  | 'approved'
  | 'sent'
  | 'awaiting_reply'
  | 'reply_received'
  | 'in_review'
  | 'resolved'
  | 'closed_no_response';

export interface CommunicationCase {
  id: string;
  application: CoordinatorApplication;
  application_context: Record<string, unknown>; // {vin: ...} or {request_id: ...}
  state: CoordinatorCaseState;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface CommunicationMessage {
  id: string;
  case_id: string;
  direction: 'outbound' | 'inbound';
  channel: 'email';
  recipient: string;
  recipient_name?: string;
  sender: string;
  subject: string;
  body: string;
  sent_at: string | null;
  received_at: string | null;
  agent_drafted: boolean;
  approved_by: string | null;
  approved_at: string | null;
}

export type CoordinatorClassification =
  | 'provides_new_identity_info'
  | 'provides_attribution_candidate'
  | 'provides_redirect'
  | 'requests_clarification_needed'
  | 'requests_status'
  | 'accepts_response'
  | 'disputes_response'
  | 'requests_extension'
  | 'withdraws_request'
  | 'unrelated_message';

export interface CoordinatorCandidate {
  candidate_label: string; // human-readable name + source
  source: string; // e.g. 'records.json'
  source_id: string; // e.g. record_id
  match_score: number; // 0-100 deterministic confidence
  reasoning: string;
}

export interface CascadeOutputs {
  identity_resolution: string | null;
  disposition_plan: string | null;
  compliance_report: string | null;
  consumer_reply_draft: { subject: string; body: string } | null;
  generated_at: string | null;
  sub_agents_used: string[];
}

export interface CommunicationExtractedFacts {
  id: string;
  message_id: string;
  classification: CoordinatorClassification;
  classification_confidence: number; // 0-1
  classification_reasoning: string;
  extracted_facts: Record<string, string>;
  candidate_results: CoordinatorCandidate[];
  recommended_next_action: string;
  recommended_action_label: string;
  reviewed_by?: string;
  reviewed_at?: string;
  decision?: 'approved' | 'rejected' | 'edited' | 'escalated';
  decision_notes?: string;
  /** Server-side cascade outputs — populated when classification is provides_new_identity_info on a consumer_dsar case. */
  cascade_outputs?: CascadeOutputs | null;
}
