import {
  SYSTEM_PROMPT_CLARIFICATION_DRAFTER,
  SYSTEM_PROMPT_CONSUMER_REPLY,
  SYSTEM_PROMPT_DISPOSITION,
  SYSTEM_PROMPT_IDENTITY,
  SYSTEM_PROMPT_INBOUND_PARSER,
  SYSTEM_PROMPT_INFERENCE_DISCLOSURE,
  SYSTEM_PROMPT_OPERATOR_INQUIRY,
  SYSTEM_PROMPT_REPORT,
} from './prompts';

export const SUB_AGENT_META_TOOL_NAMES = [
  'resolve_identity',
  'plan_disposition',
  'generate_compliance_report',
  'draft_inference_disclosure',
] as const;

export const IDENTITY_TOOLS = [
  'find_party_by_email',
  'find_party_by_phone',
  'find_party_by_name',
  'find_party_by_vin',
  'get_party_360',
  'decode_inferred_attributes',
] as const;

export const DISPOSITION_TOOLS = [
  'get_request_details',
  'get_state_rule',
  'get_record_detail',
  'summarize_disposition_plan',
  'get_audit_trail',
  'get_coded_field_meaning',
] as const;

export const REPORT_TOOLS = [
  'get_request_details',
  'get_state_rule',
  'summarize_disposition_plan',
  'get_audit_trail',
  'get_record_detail',
] as const;

export const INFERENCE_DISCLOSURE_TOOLS = [
  'get_request_details',
  'get_record_detail',
  'get_coded_field_meaning',
  'get_state_rule',
] as const;

export const INBOUND_PARSER_TOOLS = [
  'find_party_by_name',
  'find_party_by_email',
  'find_party_by_phone',
  'find_party_by_vin',
  'get_record_detail',
] as const;

export const CONSUMER_REPLY_TOOLS = [
  'get_request_details',
  'get_state_rule',
  'summarize_disposition_plan',
  'get_record_detail',
] as const;

export const CLARIFICATION_TOOLS = [
  'get_request_details',
  'get_state_rule',
] as const;

export const OPERATOR_INQUIRY_TOOLS = [
  'get_open_requests',
  'get_request_details',
  'get_at_risk_requests',
  'get_pending_reviews',
  'get_audit_trail',
  'get_coded_field_meaning',
  'summarize_disposition_plan',
  'find_party_by_email',
  'find_party_by_phone',
  'find_party_by_name',
  'find_party_by_vin',
  'get_party_360',
  'decode_inferred_attributes',
  'list_intake_requests',
  'find_requests_by_consumer',
  'get_replies',
  'get_pending_consumer_replies',
  'get_record_detail',
  'get_state_rule',
  ...SUB_AGENT_META_TOOL_NAMES,
  'expand_vins_for_consumer',
  'search_vin_keyed_records',
  'get_orphan_vins',
  'get_communication_case',
  'parse_inbound_reply',
  'draft_outreach',
  'execute_post_approval_pipeline',
] as const;

export type ImplementedAgentSkillId =
  | 'identity-resolver'
  | 'disposition-planner'
  | 'report-generator'
  | 'inference-disclosure'
  | 'inbound-parser'
  | 'consumer-reply-drafter'
  | 'clarification-drafter'
  | 'operator-inquiry-handler';

export interface ImplementedAgentSkill {
  id: ImplementedAgentSkillId;
  manifestAgentId: string;
  toolName?: string;
  systemPrompt: string;
  allowedTools: readonly string[];
  allowsSubAgentMetaTools?: boolean;
  notes: string;
}

export const IMPLEMENTED_AGENT_SKILLS = [
  {
    id: 'identity-resolver',
    manifestAgentId: 'identity-resolver',
    toolName: 'resolve_identity',
    systemPrompt: SYSTEM_PROMPT_IDENTITY,
    allowedTools: IDENTITY_TOOLS,
    notes: 'Cross-system identity lookup and stitched summary.',
  },
  {
    id: 'disposition-planner',
    manifestAgentId: 'disposition-planner',
    toolName: 'plan_disposition',
    systemPrompt: SYSTEM_PROMPT_DISPOSITION,
    allowedTools: DISPOSITION_TOOLS,
    notes: 'Regulator-ready disposition narrative for a request.',
  },
  {
    id: 'report-generator',
    manifestAgentId: 'report-generator',
    toolName: 'generate_compliance_report',
    systemPrompt: SYSTEM_PROMPT_REPORT,
    allowedTools: REPORT_TOOLS,
    notes: 'Final compliance report deliverable.',
  },
  {
    id: 'inference-disclosure',
    manifestAgentId: 'report-generator',
    toolName: 'draft_inference_disclosure',
    systemPrompt: SYSTEM_PROMPT_INFERENCE_DISCLOSURE,
    allowedTools: INFERENCE_DISCLOSURE_TOOLS,
    notes: 'Customer-facing inference disclosure section.',
  },
  {
    id: 'inbound-parser',
    manifestAgentId: 'communications-coordinator',
    systemPrompt: SYSTEM_PROMPT_INBOUND_PARSER,
    allowedTools: INBOUND_PARSER_TOOLS,
    notes: 'Classifies and extracts structured facts from inbound replies.',
  },
  {
    id: 'consumer-reply-drafter',
    manifestAgentId: 'communications-coordinator',
    systemPrompt: SYSTEM_PROMPT_CONSUMER_REPLY,
    allowedTools: CONSUMER_REPLY_TOOLS,
    notes: 'Drafts SMTP-ready consumer replies for review.',
  },
  {
    id: 'clarification-drafter',
    manifestAgentId: 'communications-coordinator',
    systemPrompt: SYSTEM_PROMPT_CLARIFICATION_DRAFTER,
    allowedTools: CLARIFICATION_TOOLS,
    notes: 'Drafts targeted clarification emails from parser facts.',
  },
  {
    id: 'operator-inquiry-handler',
    manifestAgentId: 'communications-coordinator',
    systemPrompt: SYSTEM_PROMPT_OPERATOR_INQUIRY,
    allowedTools: OPERATOR_INQUIRY_TOOLS,
    allowsSubAgentMetaTools: true,
    notes: 'Email-mode operator assistant. Includes the guarded execution tool.',
  },
] as const satisfies readonly ImplementedAgentSkill[];

export function getImplementedAgentSkill(id: ImplementedAgentSkillId): ImplementedAgentSkill {
  const skill = IMPLEMENTED_AGENT_SKILLS.find((entry) => entry.id === id);
  if (!skill) throw new Error(`Unknown implemented agent skill: ${id}`);
  return skill;
}
