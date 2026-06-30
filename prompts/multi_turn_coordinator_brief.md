# Multi-turn agentic Coordinator — brief

> **Status: implemented as of 2026-05.** This was the build spec; the work has shipped. See `CLAUDE.md` for the current architecture, the live email loop, the Tab 8 cascade, the Operator Inbox, and the post-approval pipeline. This file is kept as historical record of what was asked for.


**Where:** `naica_demo_real_api_calls` (Next.js demo, Coordinator infra over Supabase pg).
**Why:** upcoming Margaret + Henry demo. Make scenarios 7 and 8 showcase agentic depth.
**Full spec:** `prompts/multi_turn_coordinator.md`.

## What needs to land

**Scenario 7 (Tab 7 · Orphan VIN):** First Coordinator outreach to Legacy CRM gets a *redirect* — Marcus says try Eric Park in dealer-network. Agent recognizes the redirect, drafts a fresh outreach to Eric, operator approves the new send, Eric replies with the customer info, attribution applied. Two outbounds, two inbounds, two operator gates.

**Scenario 8 (Tab 8 · Consumer Reply):** Maria's first reply is ambiguous. Agent drafts a clarifying question, operator approves send. Maria's specific reply triggers a cascade — identity resolver + disposition planner + report generator + drafted response email — all bundled into one approval card with a read-attestation gate. One operator approval runs the whole execution pipeline.

## Hard constraints

- MCP boundary stays read-only. Cascade orchestrates *inside* an existing read-only tool handler; writes still go through `execute_post_approval_pipeline`.
- Named-actor audit chain: `agent:coordinator`, `human:operator`, `system:execution_pipeline`, `system`. Don't blur.
- Two-step gates stay two steps in both scenarios. Don't compress.
- Maria's email is `maria.chen.com` (already aligned in JSON + pg).
- Scenarios 1–6 must not regress.
- JSON ↔ pg parity: any data change touches both.

## How to start

The full spec is goal-and-constraint shaped, not a step-by-step. Read the orientation files listed in section "Read first," then propose your own implementation plan: major design decisions, build order, risks, scope hygiene. Get sign-off before writing code.

## Definition of done

Both scenarios run end-to-end with seeded data. `npx tsc --noEmit` clean. Dev server starts cleanly. Audit chains in both tabs show the full multi-turn (+ cascade in scenario 8) with named actors.
