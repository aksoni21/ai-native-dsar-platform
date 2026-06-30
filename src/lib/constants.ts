import { PipelineStep, ScenarioConfig, StageViewId } from '@/types';

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'intake', label: 'Intake', description: 'Request received and logged', icon: 'FileText' },
  { id: 'dedup', label: 'Dedup Check', description: 'Check for duplicate requests', icon: 'Copy' },
  { id: 'search', label: 'Search', description: 'Search across data sources', icon: 'Search' },
  { id: 'vin_expand', label: 'VIN Expand', description: 'Resolve consumer → VINs and ownership windows', icon: 'Car' },
  { id: 'score', label: 'Score', description: 'Calculate match scores', icon: 'BarChart3' },
  { id: 'vin_search', label: 'VIN-User Search', description: 'Search VIN-keyed sources within ownership window', icon: 'CalendarSearch' },
  { id: 'agent_resolve', label: 'AI ID Resolve', description: 'AI resolves ambiguous identity matches', icon: 'Brain' },
  { id: 'decode', label: 'Decode', description: 'Decode coded fields', icon: 'Key' },
  { id: 'rules', label: 'Rules', description: 'Apply compliance rules', icon: 'Scale' },
  { id: 'disposition', label: 'Disposition', description: 'AI sets disposition plan', icon: 'ClipboardList' },
  { id: 'report', label: 'Report', description: 'Generate compliance report', icon: 'FileCheck' },
  { id: 'review', label: 'Review', description: 'Human review and approval', icon: 'UserCheck' },
  { id: 'execute', label: 'Execute', description: 'Execute approved actions', icon: 'Zap' },
];

export const DATA_SOURCES = ['Legacy Master DB', 'Customer Main', 'CRM', 'Vehicle Services', 'Dealer Records'];

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 1,
    label: 'Happy Path',
    shortLabel: '1 · Happy Path',
    requestId: 'REQ-001',
    description: 'Clean baseline — Maria Chen right-to-know, 3 records across 3 systems, all 5/5 matches, no exemptions',
    proactiveMessage: "Before the edge cases, here's what 'works' looks like. Maria Chen filed a CCPA right-to-know request in California. Three records across Customer Master, Data Warehouse, and Sales CRM — all 5/5 matches, no ambiguity, no exemptions. The pipeline runs end-to-end without a single human judgment call: search → score → decode → rules → disposition → report → approve → execute. Use this as the reference shape; the next five tabs show what changes when reality breaks any one of those assumptions.",
    suggestedQueries: [
      'Walk me through the pipeline',
      'What was disclosed?',
      'How long did this take?',
      'What changes when a match is ambiguous?',
    ],
    momentViewId: 'report',
    momentHeadline: 'Five clean 5/5 matches across every source system searched — one regulator-ready disclosure, the reference shape.',
  },
  {
    id: 2,
    label: '2 John Browns',
    shortLabel: '2 · Two John Browns',
    requestId: 'REQ-016',
    description: 'Two real, different consumers with the same legal name — the engine excludes the wrong John Brown to prevent wrongful disclosure under TDPSA/CCPA',
    proactiveMessage: "John Brown (TX) submitted a right-to-know request. Lexical name match returned 4 records — but one of them is a different person: a John Brown in Florida who happens to share the legal name. Email, phone, state, and address all diverge. The engine excluded the FL John with explicit reasoning, recorded it in the audit trail so we can prove we *saw* him and chose not to disclose, and is surfacing the decision for your sign-off. Wrongful disclosure to the wrong consumer is the single highest-stakes failure mode in DSAR — this is how we make sure it never happens by accident.",
    suggestedQueries: [
      'Why was the FL John excluded?',
      'What signals disambiguated them?',
      'What if I disagree with the exclusion?',
      "Show me the exclusion in the audit log",
    ],
    momentViewId: 'agent_resolve',
    momentHeadline: 'Two real John Browns — the FL one excluded with reasoning, before wrongful disclosure can happen.',
  },
  {
    id: 3,
    label: 'Different States',
    shortLabel: '3 · Multi-State',
    requestId: 'REQ-015',
    description: 'Shared household account across CA and VA residents — per-record law application: CCPA full-delete for sole-owner records, VCDPA-protected mask for shared records',
    proactiveMessage: "Thomas Wilson (California, CCPA) filed a deletion request. His shared household account also contains records co-owned with his wife Linda, who lives in Virginia (VCDPA). One DSAR, two governing statutes, three records — and each record gets the right law applied independently: Thomas's sole-owner profile gets CCPA full-delete, the joint loyalty account and the shared dealer purchase get VCDPA-aware mask-anonymize so Linda's data and warranty rights stay intact. This is the kind of cross-state nuance that's nearly impossible to do consistently by hand at any volume.",
    suggestedQueries: [
      'Why are some records masked instead of deleted?',
      'How does the engine know Linda is in VA?',
      'What does VCDPA §59.1-577 protect here?',
      'Could this disposition be challenged?',
    ],
    momentViewId: 'disposition',
    momentHeadline: 'Thomas asked for delete in CA, but his wife Linda is on some of the same records in VA — full delete for his data, mask for hers, decided per record.',
  },
  {
    id: 4,
    label: 'Federal Retention Rec',
    shortLabel: '4 · CAN-SPAM',
    requestId: 'REQ-010',
    description: 'State delete vs. federal CAN-SPAM evidence retention — the engine deletes the consumer profile but retains the suppression record, with the federal citation in the audit',
    proactiveMessage: "David Brown filed a Texas deletion request. He unsubscribed from marketing in November 2024 with a spam complaint, so we have a marketing-suppression evidence row that CAN-SPAM (16 CFR 316.5) requires us to retain until 2029-11-10 — five years from the unsubscribe. State right-to-delete (TDPSA) doesn't override federal retention. The disposition plan deletes everything except that single suppression row, with the federal citation in the audit trail. This is the kind of conflicting-law call that takes a paralegal 30+ minutes per request to research manually.",
    suggestedQueries: [
      'Why are we keeping one record?',
      'What does CAN-SPAM 16 CFR 316.5 require?',
      'Will this hold up in a regulator audit?',
      "What's deleted vs. retained?",
    ],
    momentViewId: 'disposition',
    momentHeadline: 'Delete his profile and CRM record, but keep the one row that proves we honored his 2024 unsubscribe — federal law requires that proof for five years.',
  },
   {
    id: 6,
    label: 'Orphan VIN',
    shortLabel: '7 · Orphan VIN',
    requestId: 'REQ-VIN-001',
    description: "Mary's pain — Texas right-to-know for Mike Jackson. Pipeline runs the new 2-step VIN lookup (VIN expansion + VIN-keyed search bounded by the ownership window) and the Communication Coordinator drafts a Legacy CRM archive lookup for an unattributed orphan VIN.",
    proactiveMessage: "Mike Jackson (TX) filed a right-to-know — but the gap Mary raised on May 5 is the records we'd miss if we only matched on name. Watch the rail: name-based search returns 5 PII-keyed records, and the new VIN-Expand step extracts Mike's vehicle (WAUZZZ123XY456789, owned 2019-03-15 → 2022-08-01). VIN-Keyed Search then pulls 1,091 telematics, recall, and independent-shop records inside that ownership window — and excludes 189 records tied to the previous owner (Jane Smith) and the next owner (Bob Wilson). Separately, the Communication Coordinator has an open investigation on a different VIN entirely — JT4567890ABCDEFGH, an orphan with 1,247 records and no person attribution. Click 'Orphan VINs' in the rail to see the queue; click into JT4567890 to walk the draft → approve → send → reply → parse → review → approve → write loop. Same engine that handles consumer DSAR replies — different recipient, different stakes.",
    suggestedQueries: [
      'Why was the 2018 telematics record excluded?',
      'How does VIN expansion work?',
      'How is an orphan VIN categorized as pipeline_gap?',
      'Walk me through the Legacy CRM archive outreach loop',
    ],
    momentViewId: 'vin_search',
    momentHeadline: '1,091 records pulled inside the ownership window. 189 excluded — pre-Jane, post-Bob. Name-only search would have missed all of them.',
  },
  {
    id: 8,
    label: 'Consumer Reply',
    shortLabel: '8 · Consumer Reply',
    requestId: 'REQ-MC-REPLY',
    description: "Maria Chen replied weeks after submitting her CCPA deletion request: 'I was previously known as Maria Salazar.' The Communication Coordinator parses the reply, classifies it, runs a deterministic candidate search, and queues 3 new records for operator approval — with the reply-text-required-before-approve gate.",
    proactiveMessage: "Maria Chen submitted a CCPA deletion request on March 25 and got the standard confirmation. Six weeks later she replied: 'I forgot to mention I was previously known as Maria Salazar before I got married.' That reply lands at the privacy mailbox today. The Communication Coordinator parses it, classifies it as provides_new_identity_info (97% confidence), runs a deterministic candidate search under last_name=Salazar, and queues 3 new records for operator review. Note the gate: the Approve button is disabled until you've actually read the reply text — the audit log captures time-on-page so we can prove later that no one rubber-stamped. Same Coordinator engine you saw on the Orphan VIN tab. Different recipient, different stakes.",
    suggestedQueries: [
      'What did the agent extract from the reply?',
      'Why does Approve require reading the reply first?',
      'How does this compare to the orphan VIN case?',
      'Show me the full audit chain for this case',
    ],
    momentViewId: 'coordinator_reply',
    momentHeadline: 'Same engine that handled the orphan VIN — drafted, parsed, queued for operator approval. Different recipient. Same audit guarantees.',
  },
  {
    id: 5,
    label: 'Coded Fields',
    shortLabel: '5 · Coded Fields',
    requestId: 'REQ-009',
    description: 'CCPA §1798.110 requires inferences disclosed in plain English — the decode pipeline translates raw demographic codes automatically',
    proactiveMessage: "Karen Lee filed a Connecticut right-to-know request. Her records contain 8 coded demographic fields — income, education, occupation, age range, marketing segment, vehicle segment, credit range, and household size. CTDPA and CCPA §1798.110 both require inferences disclosed in plain English, not raw codes. Without automated decoding, your team reads through cipher tables manually — that's 30–45 minutes per record. Here's the same record decoded automatically. The compliance value is the §1798.110 conformance; the operational value is the time savings.",
    suggestedQueries: [
      'What does INC_LVL = D mean?',
      'How many fields needed decoding?',
      'Why does §1798.110 require this?',
      'Show me the full decode table',
    ],
    momentViewId: 'decode',
    momentHeadline: 'Thirteen demographic codes translated into plain English',
  },
  
 
  {
    id: 7,
    label: 'Audit Trail',
    shortLabel: '6 · Audit Trail',
    requestId: 'REQ-003',
    description: 'Completed Connecticut opt-out — every AI decision, every rule, every vendor notification timestamped and citation-backed for regulator review',
    proactiveMessage: "James Williams filed a Connecticut opt-out — not California, not the default. The audit trail picks the right statute (CTDPA Section 6(a)), shows two downstream vendors notified within the 15-business-day window, and confirms GPC honor for future sessions. This is what you hand a regulator or opposing counsel if they ever ask 'show me what you did, and why.' It's not a log file — it's a litigation defense document, and it differentiates by state without anyone on your team having to hand-pick the citation.",
    suggestedQueries: [
      'Summarize this for a regulator',
      'Why CTDPA and not CCPA?',
      'Were vendors notified in time?',
      'Generate a court-ready summary',
    ],
    momentViewId: 'audit',
    momentHeadline: 'Every decision, every rule, every vendor — timestamped and citation-backed for the regulator.',
  },
  
];

export const DEFAULT_SCENARIO_ID = 1;

/**
 * Stage-view definitions used by the rail. A stage view is a navigable surface
 * inside the workflow pane — most map 1:1 onto a pipeline step, two are
 * always-on side surfaces (audit, replies). The order here is the rail order.
 */
export interface StageViewDef {
  id: StageViewId;
  label: string;
  icon: string;
  /** Index into PIPELINE_STEPS, or null for non-pipeline views (audit/replies). */
  pipelineStepIndex: number | null;
}

export const STAGE_VIEWS: StageViewDef[] = [
  { id: 'search', label: 'Search', icon: 'Search', pipelineStepIndex: 2 },
  { id: 'score', label: 'Matches', icon: 'BarChart3', pipelineStepIndex: 4 },
  { id: 'vin_search', label: 'VIN-User Search', icon: 'CalendarSearch', pipelineStepIndex: 5 },
  { id: 'orphan_list', label: 'Orphan VINs', icon: 'AlertTriangle', pipelineStepIndex: null },
  // Both Coordinator entries live in the same rail slot. Only one is
  // viewAvailable at a time (orphan scenario shows coordinator_outreach;
  // consumer-DSAR-reply scenario shows coordinator_reply), so the rail
  // shows a single "Communications Coordinator" entry in the same position
  // regardless of which scenario is active.
  { id: 'coordinator_outreach', label: 'Communications Coordinator', icon: 'Mail', pipelineStepIndex: null },
  { id: 'coordinator_reply', label: 'Communications Coordinator', icon: 'Mail', pipelineStepIndex: null },
  { id: 'agent_resolve', label: 'AI ID Resolution', icon: 'Brain', pipelineStepIndex: 6 },
  { id: 'decode', label: 'Decoded Data', icon: 'Key', pipelineStepIndex: 7 },
  { id: 'rules', label: 'Compliance Rules', icon: 'Scale', pipelineStepIndex: 8 },
  { id: 'disposition', label: 'Disposition', icon: 'ClipboardList', pipelineStepIndex: 9 },
  { id: 'report', label: 'Report', icon: 'FileCheck', pipelineStepIndex: 10 },
  { id: 'review', label: 'Review', icon: 'UserCheck', pipelineStepIndex: 11 },
  { id: 'audit', label: 'Audit Trail', icon: 'Clock', pipelineStepIndex: null },
];

/** Map a pipeline step index to the stage view that displays its output, if any. */
export function viewIdForPipelineStep(stepIndex: number): StageViewId | null {
  const v = STAGE_VIEWS.find((sv) => sv.pipelineStepIndex === stepIndex);
  return v ? v.id : null;
}

// ─── Email-handler authorization ──────────────────────────────────────
// Lowercased *human* sender addresses authorized to email Izzy and have her
// act. Anyone outside this list whose mail lands in her inbox is left unread
// for human triage.
//
// IMPORTANT: Izzy's own address must NOT be on this list — that would let her
// self-authorize and reply-loop. Only operator humans should be allowlist senders.
//
// To override at runtime without editing code, set IZZY_EMAIL_ALLOWLIST in
// .env.local as a comma-separated list — `isAllowedEmailSender` reads env
// first and falls back to this default.
export const IZZY_EMAIL_ALLOWLIST_DEFAULT: string[] = [
  // Demo personas — replace with your own operator emails via IZZY_EMAIL_ALLOWLIST env var
  'shivi.sharma@yourcompany.com',
  'mary.alston@yourcompany.com',
  'harry.velazquez@yourcompany.com',
];

export function getIzzyEmailAllowlist(): string[] {
  const raw = process.env.IZZY_EMAIL_ALLOWLIST;
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return IZZY_EMAIL_ALLOWLIST_DEFAULT.map((s) => s.toLowerCase());
}

export function isAllowedEmailSender(sender: string): boolean {
  if (!sender) return false;
  return getIzzyEmailAllowlist().includes(sender.toLowerCase());
}
