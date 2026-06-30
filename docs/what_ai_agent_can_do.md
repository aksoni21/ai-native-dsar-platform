1. Generate the final compliance report for REQ-001.
    - Generate the final compliance report for Request 1, 2, and 5. save it to my documents and email it to margaret alston

2. Draft the inferences section for Karen Lee's letter — REQ-009.
    -Draft the inferences section for Karen Lee's letter.




1. "Generate the final compliance report for REQ-001."
  Spawns generate_compliance_report sub-agent → which itself calls get_request_details,
  get_state_rule, summarize_disposition_plan, get_audit_trail → returns a full
  litigation-defense PDF-ready document with statutory citations, in one turn. Shows:
  agents-calling-agents, not just tool-calling.
  2. "Draft the inferences section for Karen Lee's letter — REQ-009."
  Spawns draft_inference_disclosure sub-agent → walks every matched record, decodes 13 coded
  fields across CustomerMaster + SalesCRM, composes §1798.110(a)(5)-conformant prose Henry
  can paste straight into the reply. Shows: agentic decode + customer-language composition in
   one shot.
  3. "Draft the disposition plan for REQ-008 with proper exemption citations."
  Spawns plan_disposition sub-agent → pulls the full Texas TDPSA + federal CAN-SPAM rule
  frame, identifies which records hit a litigation-hold exemption, returns per-record
  dispositions with statute numbers quoted verbatim. Shows: real legal reasoning, not
  boilerplate.

  Cross-system identity resolution

  4. "Who is Sofia Rodriguez across our stack? She also goes by Chen."
  Spawns resolve_identity sub-agent → probes name in DWH/CRM/marketing/DMS/telematics,
  collects party_ids, fans out to get_party_360, surfaces the maiden-name → married-name
  stitching gap explicitly. Shows: handles identity inconsistencies most matchers miss.
  5. "I have a VIN — 1N4AL3AP8KC123456 — and no email. Who owns it?"
  find_party_by_vin → telematics + DMS + DWH purchase facts → can identify a DMS-only
  consumer who never enrolled in connected services. Shows: works from any signal, not just
  email.

  Henry's daily pain — reply queue

  6. "What replies am I owed? Sort by urgency."
  get_pending_consumer_replies → sweeps every pending_review reply in the queue, joins to
  deadline data, returns sorted by days_until_deadline ascending with the agent's draft
  already attached. Shows: across-the-queue triage without naming a request first.
  7. "For each pending reply, tell me what to do and give me the draft."
  Same tool — but the agent narrates per-row: "REQ-002 is 28 days past SLA, AI matching
  already caught the maiden-name records, draft just needs to confirm scope to Sofia." Shows:
   reasoning over tool output, not just dumping it.

  Henry's pain — coded fields

  8. "What does income code H mean, and how would I phrase that to a customer?"
  get_coded_field_meaning → returns "$200,000–$249,999" + the full code table for context.
   ascending with the agent's draft already attached. Shows: across-the-queue triage without naming a request first.
  
  9. "Walk me through every coded field on REQ-009 and explain the business purpose of each."
  get_request_details → decoded_fields map → agent groups them (financial / vehicle / household) and explains why each
  is collected. Shows: domain knowledge layered over decode.

  SLA / risk monitoring (Margaret's view)

  10. "What's at risk this week? Anything I need to escalate?"
  get_at_risk_requests → get_request_details on each → agent flags which are s

  - src/lib/tools.ts — added allReplies import, runInferenceDisclosure import,
   two new TOOL_DEFINITIONS entries (get_pending_consumer_replies,
  draft_inference_disclosure), two new executeTool cases.
  - src/lib/system-prompt.ts — pipeline-tools paragraph now mentions
  get_pending_consumer_replies with Henry-framed guidance; sub-agents list now
   includes draft_inference_disclosure with usage hints.
  - src/lib/sub-agents/prompts.ts — added SYSTEM_PROMPT_INFERENCE_DISCLOSURE
  (procedure, output structure, ethnicity-field carve-out).
  - src/lib/sub-agents/inference-disclosure.ts — NEW. Same shape as
  report-generator.ts: tool whitelist + runInferenceDisclosure(requestId) thin
   wrapper around runSubAgent.

  Sample chat queries that exercise each new tool

  - Piece 1: "Generate the compliance report for REQ-001." → fires
  generate_compliance_report.
  - Piece 2: "What replies am I owed?" / "Clear my reply queue." → fires
  get_pending_consumer_replies (returns Sofia Rodriguez REQ-002 first, John
  Smith REQ-004 second, both overdue).
  - Piece 3: "Draft the inference disclosure for REQ-009." / "Give me the
  §1798.110 inferences section in customer language for Karen Lee." → fires
  draft_inference_disclosure (REQ-009 returns 13 decoded fields across REC-021
   + REC-022, cited under CTDPA).

  Architecture boundary respected

  All three additions are read-only. Drafts surface for human review; sending
  the email, marking the reply resolved, and executing deletions remain in the
   post-approval execution pipeline outside MCP.
