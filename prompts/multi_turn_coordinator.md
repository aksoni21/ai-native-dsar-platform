# Multi-turn agentic Coordinator — feature spec

> **Status: implemented as of 2026-05.** This was the build spec; the work has shipped. See `CLAUDE.md` for the current architecture (live SMTP/IMAP loop, Tab 7 + 8 multi-turn flows, 4-agent cascade, Operator Inbox, approval-phrase enforcement, and the real PPTX + email pipeline). This file is kept as historical record of what was asked for.


You're picking up the Naica DSAR demo to extend two scenarios with multi-turn agentic behavior in the Communication Coordinator. The goal is to make scenarios 7 and 8 showcase the "agent of agents" story for the upcoming Margaret + Henry demo.

**You plan the implementation.** This document defines what the demo should *do* and the architectural constraints you must respect. Your first deliverable is a build plan — not code. Read, ask clarifying questions if needed, propose a plan, get sign-off, then build.

---

## Read first (orientation, not a to-do list)

These files give you the lay of the land. Don't change any of them yet — just understand what's there:

- `CLAUDE.md` (project root) — architecture overview, the read-only-MCP / writes-via-pipeline boundary, the eight scenarios
- `src/lib/sub-agents/` — existing sub-agent runner + system prompts + wrapper modules (identity-resolver, disposition-planner, report-generator, inference-disclosure, inbound-parser)
- `src/components/requests/RequestDetail/OrphanInvestigationView.tsx` — current single-turn orphan VIN flow (scenario 7)
- `src/components/requests/RequestDetail/ConsumerReplyReviewView.tsx` — current single-turn consumer reply flow (scenario 8)
- `src/components/coordinator/` — message review primitives + audit chain renderer + the `useCoordinatorCase` hook
- `src/data/communication_messages.json`, `communication_extracted_facts.json`, `communication_cases.json`, `audit_trail.json` — current Coordinator data shapes
- `src/lib/coordinator-db.ts` — pg-backed loaders that the React hook + agent tools both use

Coordinator data lives in **both** `src/data/*.json` and the `comm_coordinator.*` Postgres tables (Supabase). The JSON is the backfill source; pg holds live state. Any data change touches both.

---

## What the demo needs to show

### Scenario 7 (Tab 7 · Orphan VIN, REQ-VIN-001, Mike Jackson)

**Today:** the Coordinator drafts one outreach to the Legacy CRM Archive team, gets back a clean answer with the customer info, operator approves, attribution applied. One round-trip.

**Target behavior:** the Coordinator's first outreach gets a *redirect* — Marcus from Legacy CRM says "not in my archive, try Eric Park in dealer-network." The Coordinator recognizes the redirect, drafts a fresh outreach to the new team, surfaces it for operator approval, sends, gets the answer from Eric, parses, surfaces the attribution candidate for final approval.

The user-visible story:

> *"The agent doesn't give up at one no — it takes the redirect and routes the inquiry to the right team without the operator typing a new email."*

What needs to be visible during the demo:

1. The first outbound (existing — the Legacy CRM lookup)
2. Marcus's redirect reply
3. The Coordinator's *parse* of the redirect — classification, extracted recipient + reason
4. A new outbound *automatically drafted* to Eric Park, populated with context
5. An operator gate around that new send (read + approve)
6. Eric's reply with the customer info
7. The standard attribution flow (parse → operator gate → execution)
8. An audit chain that shows every actor + every state transition across both turns

### Scenario 8 (Tab 8 · Consumer Reply, REQ-MC-REPLY, Maria Chen)

**Today:** Maria's reply directly states her maiden name; the Coordinator parses it and surfaces three candidate records for operator approval. One turn.

**Target behavior — two changes layered together:**

**(a) Multi-turn with clarification.** Maria's first reply is *ambiguous* ("please look into my old account, I had things under a different name"). The Coordinator recognizes ambiguity, drafts a precise follow-up question. Operator approves the clarification send. Maria replies a second time with the specifics.

**(b) Cascade on resolution.** Once Maria's specific reply is parsed as `provides_new_identity_info`, the Coordinator orchestrates a chain of existing sub-agents:
  - Identity resolution under the new name
  - Updated disposition plan covering the newly-discovered records
  - Regenerated regulator-ready compliance report
  - A drafted response email to Maria explaining what was found and what will happen

All four outputs are bundled into **one approval card**. The operator reviews each, attests they've read them, and approves the bundle once. The execution pipeline runs everything: applies the new disposition, updates the audit trail, sends Maria's response, resets the SLA clock.

The user-visible story:

> *"The agent asks the right clarifying question first, and once it has what it needs, it does the rest of the work — search, plan, report, response — and surfaces it all for one operator review."*

What needs to be visible during the demo:

1. Maria's original DSAR confirmation (existing, can stay collapsed)
2. Maria's first ambiguous reply
3. The Coordinator's parse showing it recognized the ambiguity, plus a drafted clarification email
4. An operator gate for the clarification send
5. Maria's second specific reply
6. The Coordinator's parse classifying it confidently
7. A bundled review card with the four cascade outputs (each expandable, each clearly attributed to its sub-agent)
8. A read-attestation gate (similar to the existing reply-text-required gate) before the bundle can be approved
9. A resolution outcome card showing what the execution pipeline did
10. An audit chain covering both turns + the cascade with named actors

---

## Architectural constraints (do not cross)

These are the rules that make the demo defensible. Any plan that violates them is wrong.

1. **Read-only MCP boundary.** Agent tools are read-only. The only write-crossing tool is `execute_post_approval_pipeline`, gated by an operator's verbatim authorization quote. Don't add a tool that writes.

2. **Cascade runs server-side, inside an existing read-only tool.** The cascade is not a new tool the agent calls — it's orchestration that fires when an inbound parse meets the right conditions. Outputs are *drafts* until the operator approves the bundle; actual writes go through the post-approval execution pipeline.

3. **Named-actor audit chain.** Every state transition has a named actor type from the existing taxonomy: `agent:coordinator`, `agent:vin_expansion`, `human:operator@example.com`, `system:execution_pipeline`, `system`. Don't blur the actor types or invent new ones unless the design genuinely needs them — and if you do, justify it in the plan.

4. **Multi-turn doesn't merge into one operator step.** In scenario 7, the redirect outreach approval and the final attribution approval are separate gates. In scenario 8, the clarification approval and the cascade-bundle approval are separate gates. The two-step structure is the demo's structural argument — don't compress it.

5. **JSON ↔ pg parity.** The seed JSON files and the `comm_coordinator.*` pg tables both need to reflect any new data. Reads come from pg now; backfill is the JSON path.

6. **Don't regress scenarios 1–6.** They use shared infrastructure (especially the `useCoordinatorCase` hook through view-availability gating). Run the dev server and click through them after structural changes.

7. **Don't change Maria's email.** It's `maria.chen.com` (changed earlier so the live SMTP/IMAP loop works without an override redirect). Both the JSON data and the pg rows are aligned. Don't revert.

---

## What the build will probably touch (your discretion on how)

You'll likely need to think about:

- The classification taxonomy used by the inbound-parser sub-agent (it's currently 8 enum values; this work probably extends it)
- One new sub-agent for the consumer-facing reply drafting in scenario 8 (or proves an existing one suffices — your call)
- A cascade orchestration mechanism that chains existing sub-agents and persists their outputs alongside the parsed-facts row
- The `useCoordinatorCase` hook, which currently selects a single most-recent outbound and inbound — this likely needs to support arrays + per-message gate state for multi-turn
- A new bundled-review UI primitive for scenario 8's four-output cascade card with a read-attestation gate
- New seed data for both scenarios (additional inbound + outbound messages, additional facts entries, additional audit entries)
- Possibly a schema change to `comm_coordinator.extracted_facts` to store cascade outputs — your call whether jsonb on the existing row or a new related table makes more sense

Don't take this list as a checklist. It's the surface area to think across when planning. Your plan should make its own choices and justify them.

---

## How I want you to start

1. Read the orientation files. Don't write code yet.
2. Produce a plan covering:
   - Your interpretation of the two scenarios' target behavior (anything ambiguous in this spec? flag it)
   - The major decisions you're making (e.g., one sub-agent vs. two; jsonb column vs. side table; how to model multi-turn state in the hook)
   - The order you intend to build in, with rough effort per step
   - Risks and what could go wrong
   - What you intend NOT to do that someone might expect (scope hygiene)
3. Present the plan, get explicit sign-off, **then** build.
4. After each major chunk lands, run `npx tsc --noEmit` and click through the affected scenario in the dev server. Don't accumulate untested changes.

---

## Definition of done

Both scenarios run cleanly end-to-end with seeded data. The orphan-VIN scenario takes the redirect and routes a fresh outreach without operator authoring; the consumer-reply scenario asks Maria's clarifying question, then bundles the cascade outputs for one approval. `npx tsc --noEmit` is clean. The dev server starts without errors. Audit chains in both scenarios show the full multi-turn (and cascade, in scenario 8) with named actors.

When you finish, post a summary covering: the plan you converged on, what you built, what you skipped and why, and any open follow-ups.
