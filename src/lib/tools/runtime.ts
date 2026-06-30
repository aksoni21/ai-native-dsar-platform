// ARCHITECTURE NOTE — MCP boundary
//
// The data tools below are ALL read-only. The configured AI model can query the pipeline,
// audit log, source systems, and rules — and nothing else.
//
// Write operations (mask, status update, vendor notification) and deletions
// live in a separate execution pipeline. The model has exactly ONE tool that
// can trigger that pipeline: `execute_post_approval_pipeline`. It is the
// audited operator-authorized entry point — the call requires a verbatim
// `authorization_quote` from the user's CURRENT message, so the model
// cannot fire it speculatively or based on prior turns alone.
//
// In production the pipeline fans out to Office365 / SendGrid / the
// internal mask service. In the demo the executor is a deterministic no-op
// that returns a manifest of "what would have happened" — the UI renders
// it as if the actions ran.
//
// Deletions are never wrapped as standalone MCP tools under any
// circumstance — they only happen inside the post-approval pipeline.

import {
  allRequests,
  allReplies,
  allCipherLegend,
  getRequestById,
  getMatchesForRequest,
  getRecordById,
  getRepliesForRequest,
  getAuditTrailForRequest,
  getAtRiskRequests,
  getPendingReviews,
  decodeField,
  getComplianceRules,
  getOwnershipsForConsumer,
  getVinKeyedRecordsInWindow,
  getOrphanVins,
} from '@/lib/data';
import {
  loadCommunicationCase,
  loadCommunicationCaseForRequest,
  loadCommunicationCaseByVin,
  loadCommunicationMessagesForCase,
  loadExtractedFactsForMessage,
  loadMessageById,
  persistExtractedFacts,
  updateNextPendingOutbound,
  upsertCoordinatorOutbound,
} from '@/lib/coordinator-db';
import type { CommunicationExtractedFacts } from '@/types';
import { daysUntil, requestTypeLabel } from '@/lib/utils';
import {
  findPartyByEmail,
  findPartyByPhone,
  findPartyByName,
  findPartyByVin,
  getParty360,
  decodeInferredAttributes,
  listIntakeRequests,
} from '@/lib/db-queries';
import { runIdentityResolver } from '@/lib/sub-agents/identity-resolver';
import { runDispositionPlanner } from '@/lib/sub-agents/disposition-planner';
import { runReportGenerator } from '@/lib/sub-agents/report-generator';
import { runInferenceDisclosure } from '@/lib/sub-agents/inference-disclosure';
import { runInboundParser } from '@/lib/sub-agents/inbound-parser';
import { runConsumerReplyDrafter } from '@/lib/sub-agents/consumer-reply-drafter';
import { runClarificationDrafter } from '@/lib/sub-agents/clarification-drafter';
import { executePostApprovalPipeline } from '@/lib/tools/execution-pipeline';
import type { RecordData } from '@/types';

function decodeRecordFields(record: RecordData): Record<string, string> {
  const decoded: Record<string, string> = {};
  if (!record.coded_fields) return decoded;
  for (const [field, code] of Object.entries(record.coded_fields)) {
    const value = decodeField(field, code);
    if (value) decoded[field] = value;
  }
  return decoded;
}

// ─── Cascade helpers ────────────────────────────────────────────────────
// Used by the parse_inbound_reply cascade fan-out. Composes a hint string
// for the identity-resolver from whatever the inbound parser extracted, and
// JSON-parses the consumer-reply drafter's output.
function buildIdentityHint(
  extracted: Record<string, unknown>,
  caseRow: { application_context: Record<string, unknown> },
): string {
  const ctx = caseRow.application_context as {
    consumer_name?: string;
    consumer_email?: string;
  };
  const parts: string[] = [];
  if (ctx.consumer_name) parts.push(`Current name: ${ctx.consumer_name}.`);
  if (ctx.consumer_email) parts.push(`Current email: ${ctx.consumer_email}.`);
  if (extracted.previous_last_name) {
    parts.push(`Previously known as ${ctx.consumer_name?.split(' ')[0] ?? ''} ${extracted.previous_last_name}.`);
  }
  if (extracted.name_change_year) {
    parts.push(`Name change year: ${extracted.name_change_year}.`);
  }
  if (extracted.corroborating_event) {
    parts.push(`Corroborating event: ${extracted.corroborating_event}.`);
  }
  if (extracted.alt_email) parts.push(`Alt email: ${extracted.alt_email}.`);
  if (extracted.alt_phone) parts.push(`Alt phone: ${extracted.alt_phone}.`);
  return parts.join(' ');
}

// In-flight dedup for parse_inbound_reply. Without this, the UI's auto-poll
// hook and a parallel API call can both kick off full parses on the same
// message — each runs the parser sub-agent + cascade independently, then
// races to persist. Whichever finishes last wins, often clobbering the other's
// merged candidate_results. Memoize the promise per messageId so concurrent
// callers share one parse run.
const parseInFlight = new Map<string, Promise<unknown>>();

function parseConsumerReplyDraft(
  summary: string,
): { subject: string; body: string } | null {
  const trimmed = summary.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(trimmed.slice(start, end + 1)) as {
      subject?: string;
      body?: string;
    };
    if (typeof obj.subject !== 'string' || typeof obj.body !== 'string') return null;
    return { subject: obj.subject, body: obj.body };
  } catch {
    return null;
  }
}

interface CandidateResultEntry {
  source: string;
  source_id: string;
  match_score: number;
  candidate_label: string;
  reasoning: string;
}

// Defensive reader for the parser's "previous last name" field. The parser
// prompt names exactly one canonical key (previous_last_name), but LLMs drift
// — past failing runs have emitted prior_last_name, previous_name, maiden_name,
// or buried the surname inside a full-name value. Walk known aliases, return
// the last token if a full name was given. This is the safety net behind the
// system-prompt contract; if it never returns undefined for valid input, the
// downstream re-search and stub-filter both run.
function extractPreviousLastName(
  facts: Record<string, unknown>,
): string | undefined {
  const aliases = [
    'previous_last_name',
    'prior_last_name',
    'previous_surname',
    'former_last_name',
    'maiden_name',
    'maiden_last_name',
    'previous_name',
    'previousLastName',
    'priorLastName',
  ];
  for (const key of aliases) {
    const v = facts[key];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    // If a full name was given (e.g. "Maria Sanchez"), pull the last token
    // — records.json stores surname only.
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1];
  }
  return undefined;
}

// Re-run the candidate search with the parser's extracted `previous_last_name`.
// Pure pg query via findPartyByName — surfaces rows the parser's own
// find_party_by_name would surface, but normalized into CandidateResultEntry
// shape and labeled as the post-clarification re-search so the cascade can
// distinguish them from the parser's original (current-name) candidates.
// Maiden-name demo records (Maria Sanchez / Maria Salazar) live in pg
// (seeded via scripts/seed_maiden_records.ts); no records.json scan.
async function reSearchUnderPreviousLastName(
  firstName: string,
  previousLastName: string,
  state: string | undefined,
): Promise<CandidateResultEntry[]> {
  const out: CandidateResultEntry[] = [];
  try {
    const probe = await findPartyByName(firstName, previousLastName, state);
    for (const m of probe.matches) {
      out.push({
        source: m.source,
        source_id: m.native_id,
        match_score: 90,
        candidate_label: `${firstName} ${previousLastName} — ${m.source}`,
        reasoning: `Re-search under maiden name '${previousLastName}' returned this row from ${m.source}. Email=${m.email ?? '(none)'}, phone=${m.phone ?? '(none)'}.`,
      });
    }
  } catch {
    // findPartyByName can throw if the pool isn't initialized in some test
    // contexts; return whatever was collected and let the caller proceed
    // with a 0-match cascade.
  }
  return out;
}

function buildCascadeLiveReplyContext(
  inboundBody: string,
  extractedFacts: Record<string, unknown>,
  candidateResults: CandidateResultEntry[],
  previousLastName: string | undefined,
): string {
  const lines: string[] = [];
  lines.push('## Live reply context');
  lines.push('');
  lines.push('The consumer just replied to the DSAR thread. Use this block as ground truth — it reflects what was actually written, not what any seed fixture says.');
  lines.push('');
  lines.push('### Literal reply body');
  lines.push('```');
  lines.push(inboundBody.trim().slice(0, 2000));
  lines.push('```');
  lines.push('');
  lines.push('### Parser-extracted facts');
  lines.push('```json');
  lines.push(JSON.stringify(extractedFacts, null, 2));
  lines.push('```');
  lines.push('');
  if (previousLastName) {
    const maidenMatches = candidateResults.filter((c) =>
      c.candidate_label.toLowerCase().includes(previousLastName.toLowerCase()),
    );
    lines.push(`### Re-search under previous_last_name='${previousLastName}'`);
    if (maidenMatches.length === 0) {
      lines.push('');
      lines.push(`**0 records found** under last_name='${previousLastName}'. No scope expansion has occurred. The narrative should: (a) acknowledge the consumer's clarification, (b) state that the re-search found zero matching records under that previous name, (c) recommend the operator verify spelling or other identifiers with the consumer before any records are added to the deletion scope.`);
    } else {
      lines.push('');
      lines.push(`**${maidenMatches.length} record(s) found** under last_name='${previousLastName}'. These are the records to fold into the deletion scope:`);
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(maidenMatches, null, 2));
      lines.push('```');
    }
    lines.push('');
  }
  lines.push('### Full candidate set (after re-search)');
  lines.push('```json');
  lines.push(JSON.stringify(candidateResults, null, 2));
  lines.push('```');
  return lines.join('\n');
}

export const TOOL_DEFINITIONS = [
  {
    name: 'get_open_requests',
    description:
      'Get all open (non-completed) DSAR requests with their status, type, consumer state, and SLA days remaining. Use this to give an overview of the current pipeline.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_request_details',
    description:
      'Get full details of a specific DSAR request including consumer info, matching records, coded field decoding, compliance rules, and disposition plan. Use this when discussing a specific request. NOTE: For request_ids in the REQ-1xxxxx range (live intake submissions), pre-materialized matches do not exist. Call find_party_by_email with the request\'s consumer_email — and/or find_party_by_name — to discover matching source-system rows directly.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: {
          type: 'string',
          description: 'The request ID, e.g. REQ-001',
        },
      },
      required: ['request_id'],
    },
  },
  {
    name: 'get_at_risk_requests',
    description:
      'Get requests that are approaching their SLA deadline and at risk of missing it. Returns requests with fewer than the specified days remaining.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_threshold: {
          type: 'number',
          description: 'Number of days threshold (default: 7)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_pending_reviews',
    description:
      'Get all requests currently waiting for human review and approval before any action is taken.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_audit_trail',
    description:
      'Get the complete audit trail for a specific request — every AI decision, rule applied, and human action, with timestamps. Use this to explain what happened or generate regulator-ready summaries.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: {
          type: 'string',
          description: 'The request ID, e.g. REQ-001',
        },
      },
      required: ['request_id'],
    },
  },
  {
    name: 'get_coded_field_meaning',
    description:
      'Decode a specific coded field value into plain English. Use this to explain what a raw code means (e.g. INC_LVL = H means "$200,000-$249,999").',
    input_schema: {
      type: 'object' as const,
      properties: {
        field_name: {
          type: 'string',
          description: 'The field name, e.g. income_code, vehicle_segment_code',
        },
        code: {
          type: 'string',
          description: 'The raw code value, e.g. H, SUV-M, 4',
        },
      },
      required: ['field_name', 'code'],
    },
  },
  {
    name: 'summarize_disposition_plan',
    description:
      'Generate a plain-English summary of what will happen to a consumer\'s data — what will be deleted, what will be masked, and what will be retained and why (with statutory citations).',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: {
          type: 'string',
          description: 'The request ID, e.g. REQ-001',
        },
      },
      required: ['request_id'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Source-system tools — query Postgres directly across `dwh`, `crm`,
  // `marketing`, `dealer_dms`, `vehicle_telematics`, and `naica_demo`. All
  // read-only. Use these when the user asks about a specific consumer who
  // may not yet have a DSAR request (vs. the pipeline tools above).
  // ────────────────────────────────────────────────────────────────────────
  {
    name: 'find_party_by_email',
    description:
      'Search every source system (DWH, CRM, marketing, dealer DMS, telematics, intake_requests) for rows matching this email. Use to answer "what do we have on this person across our stack" and to discover identity inconsistencies (same person under different names in different systems).',
    input_schema: {
      type: 'object' as const,
      properties: {
        email: { type: 'string', description: 'The email address to search for (case-insensitive).' },
      },
      required: ['email'],
    },
  },
  {
    name: 'find_party_by_phone',
    description:
      'Search every source system for rows matching this phone number. Phone numbers are normalized (digits only, leading 1 stripped) on both sides so format differences across systems do not cause misses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Phone number in any format — will be normalized.' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'find_party_by_name',
    description:
      'Search every source system for rows matching this first + last name (case-insensitive). Optional state filter narrows the search where the column exists. Useful for namesake disambiguation (two different John Browns) and for catching maiden-name records via DWH/CRM `previous_last_name`.',
    input_schema: {
      type: 'object' as const,
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        state: { type: 'string', description: 'Optional 2-letter state code to narrow results (e.g. "CA").' },
      },
      required: ['first_name', 'last_name'],
    },
  },
  {
    name: 'find_party_by_vin',
    description:
      'Look up a vehicle by VIN across telematics, dealer DMS, and the DWH purchase/service facts. Use when the consumer provides a VIN but the matcher cannot find them by email or name (e.g., DMS-only consumers like Carmen Rios who never enrolled in connected services).',
    input_schema: {
      type: 'object' as const,
      properties: {
        vin: { type: 'string', description: '17-character vehicle identification number.' },
      },
      required: ['vin'],
    },
  },
  {
    name: 'get_party_360',
    description:
      'Return the full cross-system picture for a person identified by their DWH party_id (a UUID). Includes golden record, inferred attributes, purchases, service events, CRM contact + cases + opportunities, marketing subscription + recent sends + suppression + loyalty, dealer DMS service history, and telematics enrollments. Identity stitching across systems is email-based; if the person has different emails in different systems some sources may under-report.',
    input_schema: {
      type: 'object' as const,
      properties: {
        party_id: { type: 'string', description: 'UUID from dwh.customer_main.party_id' },
      },
      required: ['party_id'],
    },
  },
  {
    name: 'decode_inferred_attributes',
    description:
      'For a given DWH party_id, return the raw coded fields in `dwh.inferred_attributes` (income_band_cd, marketing_seg_cd, etc.) alongside their plain-English decoded values per the cipher legend. ML scores (churn, LTV, propensity) are returned as-is. Use to demonstrate the decode pipeline that translates internal codes to disclosable values for right-to-know responses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        party_id: { type: 'string', description: 'UUID from dwh.customer_main.party_id' },
      },
      required: ['party_id'],
    },
  },
  {
    name: 'list_intake_requests',
    description:
      'List recent privacy requests submitted via the public intake form (the naica_demo.intake_requests table). Optionally filter by status. Ordered newest-first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description:
            'Optional status filter — one of: received, processing, pending_review, approved, completed, denied, duplicate_closed.',
        },
        limit: {
          type: 'number',
          description: 'Max rows to return (default 25, hard cap 100).',
        },
      },
      required: [],
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Drill-down tools — pull a single slice of a request without re-fetching
  // the full bundle. Read-only.
  // ────────────────────────────────────────────────────────────────────────
  {
    name: 'find_requests_by_consumer',
    description:
      'Look up DSAR requests by consumer name when the user gives you a person ("Karen Lee", "Sofia Rodriguez") instead of a REQ-ID. Returns every request whose consumer_name contains the query (case-insensitive substring), across ALL statuses including completed ones. Use this FIRST whenever the user names a consumer without providing the REQ-ID, then call the appropriate downstream tool/sub-agent with the resolved id. If multiple matches come back, prefer the most recent open one and surface the ambiguity to the user before acting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Full or partial consumer name, case-insensitive (e.g. "Karen Lee", "Rodriguez", "torres").',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_replies',
    description:
      'Get the full reply thread for a request — every message the consumer sent, with extracted info, the agent\'s category/summary, and the suggested next action. Use when the consumer has replied to a clarification (e.g. REQ-010) and you need the actual text, not just the count.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: { type: 'string', description: 'The request ID, e.g. REQ-010' },
      },
      required: ['request_id'],
    },
  },
  {
    name: 'get_pending_consumer_replies',
    description:
      'Sweep every consumer reply in the queue that is still awaiting an outbound response (status=pending_review) and return one row per reply with the agent\'s draft response already attached. Sorted by SLA urgency (soonest deadline first). Use when the operator asks "what replies do I owe?", "what\'s in my reply queue?", or wants to clear the inbox without first picking a request_id. The drafts are recommendations only — sending the response and marking the reply resolved happen in the post-approval execution pipeline, not from this tool.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_record_detail',
    description:
      'Get a single matched record by its record_id, with all coded fields decoded into plain English. Use to drill into one record (e.g. when discussing a specific row from REQ-009) without re-fetching every match.',
    input_schema: {
      type: 'object' as const,
      properties: {
        record_id: { type: 'string', description: 'The record ID, e.g. REC-002' },
      },
      required: ['record_id'],
    },
  },
  {
    name: 'get_state_rule',
    description:
      'Look up the full compliance rule for a state + request type, even if no current request matches. Returns deadline, extension window, required disclosures, exceptions, vendor-notification requirements, and per-record-type disposition rules. Use for hypotheticals ("what would the deadline be in Virginia?") and for cross-state comparisons.',
    input_schema: {
      type: 'object' as const,
      properties: {
        state: { type: 'string', description: '2-letter state code, e.g. CA, VA, CO' },
        request_type: {
          type: 'string',
          description: 'One of: right_to_delete, right_to_know, right_to_correct, right_to_opt_out',
        },
      },
      required: ['state', 'request_type'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Sub-agent meta-tools — each invocation spawns a focused model-backed sub-agent
  // with its own system prompt and a strict subset of read-only tools. The
  // parent agent sees only the final summary. Sub-agents cannot recurse:
  // these meta-tools are NOT in any sub-agent's whitelist.
  // ────────────────────────────────────────────────────────────────────────
  {
    name: 'resolve_identity',
    description:
      'Run the cross-system identity-resolution sub-agent. Given any hint (email, phone, name, VIN, or a natural-language description), it probes every source system, fans out to get_party_360 on the matched DWH party_ids, and returns a stitched summary that names cross-system inconsistencies (different emails, maiden-name records, format-mismatched phones, DMS-only enrollment). Prefer this over chaining find_party_by_* probes manually.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hint: {
          type: 'string',
          description:
            'Free-text identifier or description — an email, phone, full name, VIN, or a sentence like "Carmen Rios in California who bought a 2019 Rogue".',
        },
      },
      required: ['hint'],
    },
  },
  {
    name: 'plan_disposition',
    description:
      'Run the disposition-planner sub-agent for a specific request. It pulls the request details, audit trail, and applicable state rule, then drafts a regulator-ready narrative with per-record exemption clauses and statutory citations (CCPA §1798.105(d), CPRA §1798.121, etc.). Prefer this over manually composing from summarize_disposition_plan + get_audit_trail.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: { type: 'string', description: 'The request ID, e.g. REQ-001' },
      },
      required: ['request_id'],
    },
  },
  {
    name: 'generate_compliance_report',
    description:
      'Run the report-generator sub-agent for a specific request. It produces the final regulator-ready PRIVACY COMPLIANCE REPORT — the litigation-defense artifact that goes to the consumer and into the audit file. It pulls the request details, full state rule, disposition plan, and audit trail, then composes a formal report with sections for Summary, Data Sources Searched, Personal Information Disclosed / Actions Taken, Disposition (with statutory citations), and Verification. Prefer this over plan_disposition when the user wants the full deliverable document, not just the disposition reasoning.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: { type: 'string', description: 'The request ID, e.g. REQ-001' },
      },
      required: ['request_id'],
    },
  },
  {
    name: 'draft_inference_disclosure',
    description:
      'Run the inference-disclosure sub-agent for a specific request. It walks every matched record, decodes every coded demographic / behavioral field across them (income_code, marketing_segment_code, vehicle_segment_code, ethnicity_code, etc.), and composes the customer-facing INFERENCES section of a Right-to-Know response letter — the §1798.110(a)(5) section in plain second-person prose the privacy team can paste straight into the consumer reply. Prefer this over chaining get_record_detail + get_coded_field_meaning manually when the user asks for "the inference disclosure", "the inferences section of the letter", or "what inferences do we hold on this person, in customer language".',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_id: { type: 'string', description: 'The request ID, e.g. REQ-009' },
      },
      required: ['request_id'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Communication Coordinator — read-only. The Coordinator drafts outbound,
  // parses inbound, runs deterministic candidate searches, and surfaces
  // everything to a human review queue. None of these tools write to a
  // system of record; the operator approves and the post-approval execution
  // pipeline applies the change.
  // See compliance-agentic-system/.../communication_coordinator.md.
  // ────────────────────────────────────────────────────────────────────────
  {
    name: 'expand_vins_for_consumer',
    description:
      'Resolve a consumer to every VIN they have ever owned, with deterministic ownership windows (start_date → end_date) and the source system that supplied the dates (dealer records, DMV, sales, telematics_account). Use this BEFORE search_vin_keyed_records when answering a DSAR-time question that involves VIN-keyed sources (telematics, manufacturing, recall, independent-shop). Returns an empty list when the consumer has no PII-keyed dealer record bridging name → VIN.',
    input_schema: {
      type: 'object' as const,
      properties: {
        consumer_name: {
          type: 'string',
          description: 'Full consumer name as recorded on the request, e.g. "John Brown".',
        },
      },
      required: ['consumer_name'],
    },
  },
  {
    name: 'search_vin_keyed_records',
    description:
      'Search VIN-keyed sources (Telematics, ManufacturingQA, RecallCampaigns, IndependentShopService) for records on a specific VIN within a temporal ownership window. Records outside the window are explicitly NOT returned — they belong to a previous or next owner. Use to answer "what telematics/recall/service data did we collect on this consumer\'s vehicle while they owned it" without leaking pre- or post-ownership data. Pass the start_date and end_date returned by expand_vins_for_consumer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vin: { type: 'string', description: '17-character VIN.' },
        start_date: { type: 'string', description: 'Ownership window start, ISO date (YYYY-MM-DD).' },
        end_date: {
          type: 'string',
          description: 'Ownership window end, ISO date. Pass null/undefined for currently-owned vehicles.',
        },
      },
      required: ['vin', 'start_date'],
    },
  },
  {
    name: 'get_orphan_vins',
    description:
      'List VINs in our VIN-keyed sources that have NO person attribution after `threshold_days` (default 365). Each orphan is categorized deterministically as `pipeline_gap` — the link probably exists in some internal system (Legacy CRM archive, dealer-network feeds, connected vehicle platform) but isn\'t yet stitched into the DSAR pipeline. Use to answer "what records do we have that we cannot tie to a consumer?" Returns the orphan list, not personal data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        threshold_days: {
          type: 'number',
          description: 'Min days since first-seen to qualify as an orphan (default 365).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_communication_case',
    description:
      'Look up a Coordinator case by id, request_id, or VIN. Returns the case + its full message thread (outbound + inbound) + extracted facts for any inbound parse. Use when the operator asks about an in-flight Coordinator investigation ("show me the orphan VIN case", "what did Maria say in her reply"). Read-only; never writes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string', description: 'CASE-* id, e.g. CASE-VIN-001.' },
        request_id: { type: 'string', description: 'Look up the consumer-DSAR case for this request, e.g. REQ-MC-REPLY.' },
        vin: { type: 'string', description: 'Look up the orphan-VIN case for this VIN, e.g. JT4567890ABCDEFGH.' },
      },
      required: [],
    },
  },
  {
    name: 'parse_inbound_reply',
    description:
      "Return the Coordinator's classification + extracted facts + ranked candidate matches + recommended next action for an inbound message. Classification taxonomy: provides_new_identity_info, provides_attribution_candidate, requests_status, accepts_response, disputes_response, requests_extension, withdraws_request, unrelated_message. Candidates come from a deterministic search against the named source system — never probabilistic identity inference. Two-tier behavior: if a pre-baked extracted_facts row exists (seed scenarios, or a prior run), it is returned directly. If not (live IMAP-ingested replies), a focused sub-agent classifies the reply, runs find_party_by_* probes for candidates, and persists the result so subsequent calls are fast. Use to walk through what the agent extracted from a reply without claiming anything was applied.",
    input_schema: {
      type: 'object' as const,
      properties: {
        message_id: { type: 'string', description: 'MSG-* id, e.g. MSG-MC-IN-001.' },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'draft_outreach',
    description:
      'Return the Coordinator-drafted outbound for a case (Legacy CRM archive lookup for orphan VIN, DSAR confirmation for consumer DSAR). The draft is ready for operator review — agent does not send. Use to show what the Coordinator would send before the operator approves.',
    input_schema: {
      type: 'object' as const,
      properties: {
        case_id: { type: 'string', description: 'CASE-* id, e.g. CASE-VIN-001.' },
      },
      required: ['case_id'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Execution pipeline — single guarded tool
  //
  // The ONLY model-callable tool that crosses the read-only boundary. It fires
  // the post-approval execution pipeline (PPTX generation, save to
  // Documents, send email). The operator's natural-language imperative in
  // the CURRENT message is the approval — `authorization_quote` must echo
  // that imperative verbatim. Bundle ALL requested actions for ALL named
  // requests into ONE call.
  // ────────────────────────────────────────────────────────────────────────
  {
    name: 'execute_post_approval_pipeline',
    description:
      'Fire the execution pipeline. Generates compliance report PPTX files for each named request, saves them to the operator\'s Documents folder, and optionally emails them to a named recipient. APPROVAL RULES: PPTX generation and save-to-Documents are local, reversible artifact creation and DO NOT require any approval phrase — fire on a plain operator request like "make a PPT for REQ-001" or "generate the compliance deck." Sending email DOES require approval, since it crosses an external boundary; the bundle must include `authorization_quote` set to exactly "I approve this action" (singular, one bundled action) or "I approve these actions" (plural, two or more bundled actions). Case-insensitive, trailing punctuation OK. The server enforces this — calls that include `send_email` with a non-matching quote are rejected. STRICT RULES: (1) bundle ALL requested actions for ALL named requests into ONE call — three actions on two requests is one call with `actions.length === 3`, not three calls; (2) never call speculatively, never call twice in a row; (3) when only generating/saving PPTs, leave `authorization_quote` blank or pass an empty string; (4) the pipeline returns a manifest the UI renders as a receipt — do not narrate the manifest in your text reply.',
    input_schema: {
      type: 'object' as const,
      properties: {
        request_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Request IDs the pipeline should act on, e.g. ["REQ-001", "REQ-002"].',
        },
        actions: {
          type: 'array',
          description: 'Actions to fire across the named requests. Bundle all of them in one call.',
          items: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: ['generate_pptx', 'save_to_documents', 'send_email'],
                description: 'Which pipeline step to fire. `save_to_documents` only matters when paired with `generate_pptx`.',
              },
              email_recipient_name: {
                type: 'string',
                description: 'Required when kind === "send_email". The name the operator used (e.g. "Mary"). Recipient address resolved server-side.',
              },
              email_subject: {
                type: 'string',
                description: 'Optional email subject. If omitted, the executor synthesizes one from the request IDs.',
              },
            },
            required: ['kind'],
          },
        },
        authorization_quote: {
          type: 'string',
          description: 'Required only when the bundle includes `send_email`. Must be a verbatim copy of "I approve this action" (singular) or "I approve these actions" (plural) from the operator\'s CURRENT message. Case-insensitive, trailing punctuation OK. Pass empty string when the bundle is PPTX-only.',
        },
      },
      required: ['request_ids', 'actions'],
    },
  },
];

export type ToolName = typeof TOOL_DEFINITIONS[number]['name'];

export interface ExecuteToolContext {
  /**
   * Fires once per tool_use block produced inside a sub-agent's internal loop.
   * Used by the chat route to stream live "tool started" events back to the UI
   * so the bubble can show a live counter while the sub-agent is running.
   */
  onSubAgentToolStart?: (toolName: string) => void;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx?: ExecuteToolContext,
): Promise<unknown> {
  switch (name) {
    case 'get_open_requests': {
      const open = allRequests.filter(
        (r) => r.status !== 'completed' && r.status !== 'duplicate_closed'
      );
      return open.map((r) => ({
        id: r.id,
        consumer_name: r.consumer_name,
        consumer_state: r.consumer_state,
        request_type: requestTypeLabel(r.request_type),
        status: r.status,
        days_until_deadline: daysUntil(r.deadline_at),
        deadline_at: r.deadline_at,
        created_at: r.created_at,
      }));
    }

    case 'get_request_details': {
      const requestId = input.request_id as string;
      const request = getRequestById(requestId);
      if (!request) return { error: `Request ${requestId} not found` };

      const matches = getMatchesForRequest(requestId);
      const replies = getRepliesForRequest(requestId);
      const auditEntries = getAuditTrailForRequest(requestId);

      const matchesWithRecords = matches.map((m) => {
        const record = getRecordById(m.record_id);
        return {
          ...m,
          record: record
            ? {
                id: record.id,
                data_source: record.data_source,
                name: `${record.first_name} ${record.last_name}`,
                email: record.email,
                state: record.state,
                coded_fields_count: Object.keys(record.coded_fields || {}).length,
                decoded_fields: decodeRecordFields(record),
              }
            : null,
        };
      });

      const complianceRule = getComplianceRules(request.consumer_state, request.request_type);

      return {
        request,
        days_until_deadline: daysUntil(request.deadline_at),
        matches: matchesWithRecords,
        replies_count: replies.length,
        latest_reply: replies[replies.length - 1] || null,
        audit_entries_count: auditEntries.length,
        compliance_rule: complianceRule
          ? {
              deadline_days: complianceRule.deadline_days,
              required_disclosures: complianceRule.required_disclosures,
              exceptions: complianceRule.exceptions,
            }
          : null,
      };
    }

    case 'get_at_risk_requests': {
      const threshold = (input.days_threshold as number) ?? 7;
      const atRisk = getAtRiskRequests(threshold);
      return atRisk.map((r) => ({
        id: r.id,
        consumer_name: r.consumer_name,
        consumer_state: r.consumer_state,
        request_type: requestTypeLabel(r.request_type),
        status: r.status,
        days_until_deadline: daysUntil(r.deadline_at),
        deadline_at: r.deadline_at,
      }));
    }

    case 'get_pending_reviews': {
      const pending = getPendingReviews();
      return pending.map((r) => ({
        id: r.id,
        consumer_name: r.consumer_name,
        consumer_state: r.consumer_state,
        request_type: requestTypeLabel(r.request_type),
        days_until_deadline: daysUntil(r.deadline_at),
        created_at: r.created_at,
      }));
    }

    case 'get_audit_trail': {
      const requestId = input.request_id as string;
      const entries = getAuditTrailForRequest(requestId);
      return entries.map((e) => ({
        action: e.action,
        actor: e.actor,
        timestamp: e.created_at,
        details: e.details,
      }));
    }

    case 'get_coded_field_meaning': {
      const fieldName = input.field_name as string;
      const code = input.code as string;
      const legend = allCipherLegend[fieldName];
      if (!legend) return { error: `Field "${fieldName}" not found in cipher legend` };
      const meaning = legend.codes[code];
      return {
        field_name: fieldName,
        field_label: legend.label,
        code,
        meaning: meaning || `Unknown code "${code}" for field "${fieldName}"`,
        all_codes: legend.codes,
      };
    }

    case 'summarize_disposition_plan': {
      const requestId = input.request_id as string;
      const request = getRequestById(requestId);
      if (!request) return { error: `Request ${requestId} not found` };

      const matches = getMatchesForRequest(requestId);
      const toDelete = matches.filter((m) => m.disposition === 'full_delete');
      const toMask = matches.filter((m) => m.disposition === 'mask_anonymize');
      const toRetain = matches.filter((m) => m.disposition === 'retain_exempt');

      return {
        request_id: requestId,
        consumer_name: request.consumer_name,
        request_type: requestTypeLabel(request.request_type),
        summary: {
          full_delete: toDelete.map((m) => ({
            record_id: m.record_id,
            data_source: getRecordById(m.record_id)?.data_source,
            reasoning: 'No active exemption — full deletion authorized',
          })),
          mask_anonymize: toMask.map((m) => ({
            record_id: m.record_id,
            data_source: getRecordById(m.record_id)?.data_source,
            reasoning: m.agent_reasoning || 'Partial retention required',
          })),
          retain_exempt: toRetain.map((m) => ({
            record_id: m.record_id,
            data_source: getRecordById(m.record_id)?.data_source,
            reasoning: m.agent_reasoning || 'Statutory exemption applies',
          })),
        },
        plain_english: `For ${request.consumer_name}: ${toDelete.length} record(s) will be fully deleted, ${toMask.length} will be anonymized, and ${toRetain.length} will be retained under statutory exemption. No action executes until a human approves.`,
      };
    }

    // ────────────────────────────────────────────────────────────────────
    // Source-system tools — Postgres-backed
    // ────────────────────────────────────────────────────────────────────
    case 'find_party_by_email': {
      return await findPartyByEmail(input.email as string);
    }

    case 'find_party_by_phone': {
      return await findPartyByPhone(input.phone as string);
    }

    case 'find_party_by_name': {
      return await findPartyByName(
        input.first_name as string,
        input.last_name as string,
        input.state as string | undefined,
      );
    }

    case 'find_party_by_vin': {
      return await findPartyByVin(input.vin as string);
    }

    case 'get_party_360': {
      return await getParty360(input.party_id as string);
    }

    case 'decode_inferred_attributes': {
      return await decodeInferredAttributes(input.party_id as string);
    }

    case 'list_intake_requests': {
      return await listIntakeRequests(
        input.status as string | undefined,
        input.limit as number | undefined,
      );
    }

    // ────────────────────────────────────────────────────────────────────
    // Drill-down tools
    // ────────────────────────────────────────────────────────────────────
    case 'find_requests_by_consumer': {
      const query = (input.name as string)?.trim().toLowerCase();
      if (!query) return { error: 'Empty name query' };
      const matches = allRequests
        .filter((r) => r.consumer_name.toLowerCase().includes(query))
        .map((r) => ({
          id: r.id,
          consumer_name: r.consumer_name,
          consumer_email: r.consumer_email,
          consumer_state: r.consumer_state,
          request_type: requestTypeLabel(r.request_type),
          status: r.status,
          deadline_at: r.deadline_at,
          created_at: r.created_at,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        query: input.name,
        match_count: matches.length,
        matches,
      };
    }

    case 'get_replies': {
      const replies = getRepliesForRequest(input.request_id as string);
      return {
        request_id: input.request_id,
        reply_count: replies.length,
        replies: replies.map((r) => ({
          id: r.id,
          reply_text: r.reply_text,
          category: r.category,
          agent_summary: r.agent_summary,
          extracted_info: r.extracted_info,
          suggested_action: r.suggested_action,
          draft_response: r.draft_response,
          status: r.status,
          created_at: r.created_at,
        })),
      };
    }

    case 'get_pending_consumer_replies': {
      const pending = allReplies.filter((r) => r.status === 'pending_review');
      const now = Date.now();
      const rows = pending.map((r) => {
        const request = getRequestById(r.request_id);
        const replyMs = new Date(r.created_at).getTime();
        const daysSinceReply = Math.max(
          0,
          Math.floor((now - replyMs) / (1000 * 60 * 60 * 24)),
        );
        return {
          request_id: r.request_id,
          consumer_name: request?.consumer_name ?? null,
          deadline_at: request?.deadline_at ?? null,
          days_since_reply: daysSinceReply,
          days_until_deadline: request?.deadline_at ? daysUntil(request.deadline_at) : null,
          reply_text: r.reply_text,
          agent_summary: r.agent_summary,
          suggested_action: r.suggested_action,
          draft_response: r.draft_response,
        };
      });
      rows.sort((a, b) => {
        if (a.days_until_deadline === null && b.days_until_deadline === null) return 0;
        if (a.days_until_deadline === null) return 1;
        if (b.days_until_deadline === null) return -1;
        return a.days_until_deadline - b.days_until_deadline;
      });
      return {
        pending_reply_count: rows.length,
        replies: rows,
      };
    }

    case 'get_record_detail': {
      const recordId = input.record_id as string;
      const record = getRecordById(recordId);
      if (!record) return { error: `Record ${recordId} not found` };
      return {
        id: record.id,
        data_source: record.data_source,
        first_name: record.first_name,
        last_name: record.last_name,
        email: record.email,
        phone: record.phone,
        state: record.state,
        address: record.address,
        record_type: record.record_type,
        coded_fields: record.coded_fields,
        decoded_fields: decodeRecordFields(record),
        raw_data: record.raw_data,
      };
    }

    case 'get_state_rule': {
      const state = input.state as string;
      const requestType = input.request_type as string;
      const rule = getComplianceRules(state, requestType);
      if (!rule) {
        return {
          error: `No compliance rule found for state=${state}, request_type=${requestType}`,
        };
      }
      return {
        state,
        request_type: requestType,
        request_type_label: requestTypeLabel(requestType),
        rule,
      };
    }

    // ────────────────────────────────────────────────────────────────────
    // Sub-agent meta-tools
    // ────────────────────────────────────────────────────────────────────
    case 'resolve_identity': {
      const result = await runIdentityResolver(input.hint as string, ctx?.onSubAgentToolStart);
      return result;
    }

    case 'plan_disposition': {
      const result = await runDispositionPlanner(input.request_id as string, ctx?.onSubAgentToolStart);
      return result;
    }

    case 'generate_compliance_report': {
      const result = await runReportGenerator(input.request_id as string, ctx?.onSubAgentToolStart);
      return result;
    }

    case 'draft_inference_disclosure': {
      const result = await runInferenceDisclosure(input.request_id as string, ctx?.onSubAgentToolStart);
      return result;
    }

    // ────────────────────────────────────────────────────────────────────
    // Communication Coordinator handlers — read-only.
    // ────────────────────────────────────────────────────────────────────
    case 'expand_vins_for_consumer': {
      const consumerName = (input.consumer_name as string) ?? '';
      const ownerships = getOwnershipsForConsumer(consumerName);
      return {
        consumer_name: consumerName,
        vins: ownerships.map((o) => ({
          vin: o.vin,
          vehicle: o.vehicle,
          start_date: o.start_date,
          end_date: o.end_date,
          source_system: o.source_system,
        })),
        note: ownerships.length === 0
          ? 'No vehicle ownership data on file. The 2-step VIN lookup needs a PII-keyed dealer record to bridge name → VIN.'
          : `Resolved ${ownerships.length} vehicle(s) from PII-keyed records. Pass each (vin, start_date, end_date) into search_vin_keyed_records.`,
      };
    }

    case 'search_vin_keyed_records': {
      const vin = input.vin as string;
      const startDate = input.start_date as string;
      const endDate = (input.end_date as string | null) ?? null;
      const records = getVinKeyedRecordsInWindow(vin, startDate, endDate);
      const inWindow = records.filter((r) => r.in_window);
      const outOfWindow = records.filter((r) => !r.in_window);
      return {
        vin,
        window: { start_date: startDate, end_date: endDate ?? 'present' },
        in_window_count: inWindow.length,
        excluded_count: outOfWindow.length,
        sample_in_window: inWindow.slice(0, 8),
        excluded_sample: outOfWindow.slice(0, 4),
        note:
          'Out-of-window records are excluded by design (pre- or post-ownership). They are returned in `excluded_sample` only for audit visibility.',
      };
    }

    case 'get_orphan_vins': {
      const orphans = getOrphanVins();
      return {
        threshold_days: (input.threshold_days as number) ?? 365,
        count: orphans.length,
        orphans,
      };
    }

    case 'get_communication_case': {
      const id = input.case_id as string | undefined;
      const requestId = input.request_id as string | undefined;
      const vin = input.vin as string | undefined;
      let found = id ? await loadCommunicationCase(id) : undefined;
      if (!found && requestId) found = await loadCommunicationCaseForRequest(requestId);
      if (!found && vin) found = await loadCommunicationCaseByVin(vin);
      if (!found) {
        return { error: 'No Coordinator case found for the supplied lookup keys.' };
      }
      const messages = await loadCommunicationMessagesForCase(found.id);
      const extractedFactsRaw = await Promise.all(
        messages
          .filter((m) => m.direction === 'inbound')
          .map((m) => loadExtractedFactsForMessage(m.id)),
      );
      const extractedFacts = extractedFactsRaw.filter(Boolean);
      return {
        case: found,
        messages,
        extracted_facts: extractedFacts,
      };
    }

    case 'parse_inbound_reply': {
      const messageId = input.message_id as string;

      // Concurrent-call dedup: if another request is already mid-parse on
      // this messageId, return the same promise — no second parser sub-agent,
      // no second cascade, no persist race.
      const inFlight = parseInFlight.get(messageId);
      if (inFlight) return inFlight;

      const parsePromise = (async () => {
      // Fast path — pre-baked facts (seed data, or a prior sub-agent run).
      const cached = await loadExtractedFactsForMessage(messageId);
      if (cached) return cached;

      // Lazy classification path — message arrived via the IMAP cron worker
      // and has no facts yet. Spawn a sub-agent to classify on demand.
      const message = await loadMessageById(messageId);
      if (!message) return { error: `Message ${messageId} not found.` };
      if (message.direction !== 'inbound') {
        return { error: `parse_inbound_reply only operates on inbound messages (got direction=${message.direction}).` };
      }

      const caseRow = await loadCommunicationCase(message.case_id);
      if (!caseRow) return { error: `Case ${message.case_id} not found.` };

      const allMessages = await loadCommunicationMessagesForCase(message.case_id);
      const outbound = allMessages
        .filter((m) => m.direction === 'outbound' && m.id !== messageId && m.sent_at)
        .pop();

      // Normalize the sender when the demo's EMAIL_OVERRIDE_TO is in effect.
      // The override redirects all outbound to the demo operator's inbox, so
      // the reply naturally comes back from that address — not from the
      // intended consumer. The DB row keeps the real sender for audit, but
      // the parser sees the consumer's expected address so it doesn't flag
      // a "sender mismatch" that's an artifact of the test harness.
      const overrideTo = process.env.EMAIL_OVERRIDE_TO;
      const expectedSender = (caseRow.application_context as { consumer_email?: string })
        .consumer_email;
      const normalizedSender =
        overrideTo && expectedSender && message.sender === overrideTo
          ? expectedSender
          : message.sender;

      const subAgent = await runInboundParser(
        {
          messageId,
          caseId: message.case_id,
          application: caseRow.application,
          applicationContext: caseRow.application_context,
          outbound: outbound ? { subject: outbound.subject, body: outbound.body } : null,
          inbound: {
            sender: normalizedSender,
            received_at: message.received_at,
            subject: message.subject,
            body: message.body,
          },
        },
        ctx?.onSubAgentToolStart,
      );

      // Parse the JSON object the sub-agent is contracted to emit.
      const trimmed = subAgent.summary.trim();
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');
      if (jsonStart < 0 || jsonEnd <= jsonStart) {
        return { error: 'Sub-agent did not return a JSON object', raw: subAgent.summary };
      }
      let parsed: Omit<CommunicationExtractedFacts, 'id' | 'message_id'>;
      try {
        parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
      } catch (err) {
        return { error: `Sub-agent JSON did not parse: ${err}`, raw: subAgent.summary };
      }

      const factsId = messageId.startsWith('MSG-')
        ? `FACTS-${messageId.slice(4)}`
        : `FACTS-${messageId}`;
      const factsRow: CommunicationExtractedFacts = {
        id: factsId,
        message_id: messageId,
        classification: parsed.classification,
        classification_confidence: Number(parsed.classification_confidence) || 0,
        classification_reasoning: parsed.classification_reasoning ?? '',
        extracted_facts: parsed.extracted_facts ?? {},
        candidate_results: parsed.candidate_results ?? [],
        recommended_next_action: parsed.recommended_next_action ?? '',
        recommended_action_label: parsed.recommended_action_label ?? '',
      };
      await persistExtractedFacts(factsRow);

      // ─── Cascade fan-out ──────────────────────────────────────────────
      // When a clarifying consumer reply lands new identity info on a DSAR
      // case, fire identity-resolver + disposition-planner + report-generator
      // + consumer-reply-drafter in parallel and persist their outputs onto
      // the same facts row. The cascade is read-only — the operator still
      // approves the bundle before any execution-pipeline write fires.
      const cascadeShouldRun =
        factsRow.classification === 'provides_new_identity_info' &&
        caseRow.application === 'consumer_dsar';

      if (cascadeShouldRun) {
        const requestId = (caseRow.application_context as { request_id?: string })
          .request_id;
        const identityHint = buildIdentityHint(factsRow.extracted_facts, caseRow);

        // Maiden-name re-search: when the parser extracted a previous_last_name,
        // run a deterministic search across pg + seed records and merge the
        // results into candidate_results before the cascade fans out. Both the
        // parser's UI surface and the downstream sub-agents now read from the
        // same source of truth — the live reply, not a fixture.
        const consumerName =
          (caseRow.application_context as { consumer_name?: string }).consumer_name ?? '';
        const firstName = consumerName.split(/\s+/)[0] ?? '';
        const currentLastName = consumerName.split(/\s+/).slice(1).join(' ');
        const previousLastName = extractPreviousLastName(
          factsRow.extracted_facts as Record<string, unknown>,
        );
        let mergedCandidates = factsRow.candidate_results;
        if (previousLastName && firstName) {
          const requestRow = requestId ? getRequestById(requestId) : undefined;
          const state =
            (requestRow as { consumer_state?: string } | undefined)?.consumer_state;
          const maidenCandidates = await reSearchUnderPreviousLastName(
            firstName,
            previousLastName,
            state,
          );
          // Collapse the parser's candidate_results down to a single canonical
          // current-name anchor + the deterministic maiden-name seeds. The
          // parser is non-deterministic about Chen-anchor shape — sometimes 1
          // aggregated entry, sometimes 3 per-system entries, sometimes a
          // redundant "Maria Sanchez — no records found" stub. Without this
          // collapse, the visible count drifts between 2 (bug: stub kept,
          // seeds missing) and 6 (parser split + seeds appended). After the
          // collapse the count is deterministic: 1 anchor + N seeds.
          const prior = factsRow.candidate_results;
          const lastLower = previousLastName.toLowerCase();
          const currentLastLower = currentLastName.toLowerCase();
          // Drop parser entries that describe the maiden name — the
          // deterministic pg re-search above is the source of truth for
          // those. Also drop no-hit stubs mentioning the previous surname.
          const anchorCandidates = prior.filter((c) => {
            const label = (c.candidate_label ?? '').toLowerCase();
            const score = Number(c.match_score ?? 0);
            const isNoHitStub = score === 0;
            const mentionsPrev = label.includes(lastLower);
            if (isNoHitStub && mentionsPrev) return false;
            if (mentionsPrev && currentLastLower && !label.includes(currentLastLower)) {
              return false;
            }
            return true;
          });
          // Pick the highest-scoring current-name entry as the single anchor.
          let anchor: typeof prior[number] | undefined;
          if (anchorCandidates.length > 0) {
            anchor = anchorCandidates.reduce((best, c) =>
              Number(c.match_score ?? 0) > Number(best.match_score ?? 0) ? c : best,
            );
          }
          // If the parser produced no usable current-name anchor (it can
          // happen when the parser's own search returned only maiden-name
          // hits and we filtered them out), synthesize one deterministically
          // from pg so the candidate set always carries both identities.
          if (!anchor && currentLastName) {
            try {
              const anchorProbe = await findPartyByName(
                firstName,
                currentLastName,
                state,
              );
              if (anchorProbe.matches.length > 0) {
                const sources = Array.from(
                  new Set(anchorProbe.matches.map((m) => m.source)),
                );
                const ids = anchorProbe.matches
                  .slice(0, 6)
                  .map((m) => `${m.source}:${m.native_id}`);
                anchor = {
                  source: sources.join(' + '),
                  source_id: ids.join('; '),
                  match_score: 82,
                  candidate_label: `${firstName} ${currentLastName} — current-name cluster (${sources.length} system${sources.length === 1 ? '' : 's'})`,
                  reasoning: `${anchorProbe.matches.length} records resolve to '${firstName} ${currentLastName}' across ${sources.length} source system${sources.length === 1 ? '' : 's'} (${sources.join(', ')}). This is the existing in-scope identity that the maiden-name records below should be merged with.`,
                };
              }
            } catch {
              // pg unavailable in some test contexts — proceed without anchor.
            }
          }
          mergedCandidates = anchor
            ? [anchor, ...maidenCandidates]
            : [...maidenCandidates];
          factsRow.candidate_results = mergedCandidates;
        }

        const liveReplyContext = buildCascadeLiveReplyContext(
          message.body,
          factsRow.extracted_facts as Record<string, unknown>,
          mergedCandidates as CandidateResultEntry[],
          previousLastName,
        );

        const onTool = ctx?.onSubAgentToolStart;
        const [identityRes, dispositionRes, reportRes, replyRes] = await Promise.all([
          runIdentityResolver(identityHint, onTool).catch((err) => ({
            summary: `(identity-resolver failed: ${String(err)})`,
            toolsUsed: [],
            iterations: 0,
          })),
          requestId
            ? runDispositionPlanner(requestId, onTool, liveReplyContext).catch((err) => ({
                summary: `(disposition-planner failed: ${String(err)})`,
                toolsUsed: [],
                iterations: 0,
              }))
            : Promise.resolve({
                summary: '(no request_id on case — disposition skipped)',
                toolsUsed: [],
                iterations: 0,
              }),
          requestId
            ? runReportGenerator(requestId, onTool, liveReplyContext).catch((err) => ({
                summary: `(report-generator failed: ${String(err)})`,
                toolsUsed: [],
                iterations: 0,
              }))
            : Promise.resolve({
                summary: '(no request_id on case — report skipped)',
                toolsUsed: [],
                iterations: 0,
              }),
          requestId
            ? runConsumerReplyDrafter(requestId, onTool, liveReplyContext).catch((err) => ({
                summary: `(consumer-reply-drafter failed: ${String(err)})`,
                toolsUsed: [],
                iterations: 0,
              }))
            : Promise.resolve({
                summary: '(no request_id on case — consumer reply skipped)',
                toolsUsed: [],
                iterations: 0,
              }),
        ]);

        const consumerReplyDraft = parseConsumerReplyDraft(replyRes.summary);

        factsRow.cascade_outputs = {
          identity_resolution: identityRes.summary || null,
          disposition_plan: dispositionRes.summary || null,
          compliance_report: reportRes.summary || null,
          consumer_reply_draft: consumerReplyDraft,
          generated_at: new Date().toISOString(),
          sub_agents_used: [
            'identity-resolver',
            'disposition-planner',
            'report-generator',
            'consumer-reply-drafter',
          ],
        };
        // Once the cascade has produced the regulator + consumer artifacts,
        // the parser's pre-cascade "Re-run identity match…" advice is stale.
        // Overwrite the recommendation so the UI surface reflects the actual
        // next operator step — review the bundle and approve scope expansion.
        const expandedCount = factsRow.candidate_results.length;
        factsRow.recommended_next_action = 'review_cascade_bundle';
        factsRow.recommended_action_label = previousLastName
          ? `Review the bundled cascade output (${expandedCount} candidates, scope expanded under '${previousLastName}') and approve the expanded deletion scope.`
          : `Review the bundled cascade output (${expandedCount} candidates) and approve the expanded deletion scope.`;
        await persistExtractedFacts(factsRow);

        // Write the cascade-drafted consumer reply to the case's 2nd
        // outbound slot. For CASE-MC-001 the slot is no longer seeded —
        // the only hardcoded outbound is OUT-001 (DSAR confirmation), and
        // OUT-002 is created fresh here by Izzy via upsertCoordinatorOutbound.
        // For other cases (CASE-VIN-001) we still UPDATE the next unsent
        // seed outbound, preserving the existing semantics.
        if (consumerReplyDraft) {
          if (message.case_id === 'CASE-MC-001') {
            await upsertCoordinatorOutbound(
              message.case_id,
              'MSG-MC-OUT-002',
              consumerReplyDraft.subject,
              consumerReplyDraft.body,
            ).catch(() => null);
          } else {
            await updateNextPendingOutbound(
              message.case_id,
              consumerReplyDraft.subject,
              consumerReplyDraft.body,
            ).catch(() => null);
          }
        }
      }

      // ─── Dynamic clarification draft ─────────────────────────────────
      // When the consumer's reply is on-topic but ambiguous (parser says
      // `requests_clarification_needed`), Izzy auto-drafts a tailored
      // follow-up ask using the parser's missing_signals list and overwrites
      // the next-pending outbound. This replaces the seed-JSON canned
      // clarification — the body the operator sees references what the
      // consumer actually wrote.
      if (
        factsRow.classification === 'requests_clarification_needed' &&
        caseRow.application === 'consumer_dsar'
      ) {
        const requestId = (caseRow.application_context as { request_id?: string })
          .request_id;
        const consumerName =
          (caseRow.application_context as { consumer_name?: string }).consumer_name ?? '';
        const facts = factsRow.extracted_facts as {
          ambiguity_reason?: string;
          missing_signals?: string | string[];
        };
        const missingRaw = facts.missing_signals;
        const missingSignals = Array.isArray(missingRaw)
          ? missingRaw
          : typeof missingRaw === 'string'
            ? missingRaw.split(/[,\s]+/).filter(Boolean)
            : [];
        if (requestId) {
          const draftRes = await runClarificationDrafter(
            {
              requestId,
              consumerName,
              inboundBody: message.body,
              missingSignals,
              ambiguityReason: facts.ambiguity_reason ?? '',
            },
            ctx?.onSubAgentToolStart,
          ).catch((err) => ({
            summary: `(clarification-drafter failed: ${String(err)})`,
            toolsUsed: [],
            iterations: 0,
          }));
          const parsedDraft = parseConsumerReplyDraft(draftRes.summary);
          if (parsedDraft) {
            if (message.case_id === 'CASE-MC-001') {
              await upsertCoordinatorOutbound(
                message.case_id,
                'MSG-MC-OUT-002',
                parsedDraft.subject,
                parsedDraft.body,
              ).catch(() => null);
            } else {
              await updateNextPendingOutbound(
                message.case_id,
                parsedDraft.subject,
                parsedDraft.body,
              ).catch(() => null);
            }
          }
        }
      }

      return factsRow;
      })();

      parseInFlight.set(messageId, parsePromise);
      try {
        return await parsePromise;
      } finally {
        parseInFlight.delete(messageId);
      }
    }

    case 'draft_outreach': {
      const caseId = input.case_id as string;
      const messages = await loadCommunicationMessagesForCase(caseId);
      const outbound = messages.find((m) => m.direction === 'outbound');
      if (!outbound) {
        return { error: `No outbound draft on file for case ${caseId}.` };
      }
      return {
        draft: outbound,
        note: 'Draft is ready for operator review. Agent does not send. Approval lives in the post-approval execution pipeline.',
      };
    }

    // ────────────────────────────────────────────────────────────────────
    // Execution pipeline — single guarded tool. Returns a manifest the UI
    // renders as a receipt.
    // ────────────────────────────────────────────────────────────────────
    case 'execute_post_approval_pipeline': {
      return await executePostApprovalPipeline(input);
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
