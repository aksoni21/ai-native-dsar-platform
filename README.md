# Instrata Demo — AI-Native DSAR (Multi-Model AI)

Interactive Next.js demo of an AI-driven DSAR (Data Subject Access Request) pipeline for automotive privacy teams. Real model API calls via Anthropic, OpenAI, or Gemini with tool-calling, sub-agents, a guarded post-approval execution pipeline that **generates real PowerPoint reports and sends real email**, a live Communications Coordinator with SMTP/IMAP round-trip, and an Operator Inbox where Izzy answers operator emails async. Backed by a real Postgres (Supabase) instance modeling six source systems — DWH, CRM, marketing, dealer DMS, vehicle telematics, and the demo intake table — plus the `comm_coordinator.*` schema for live correspondence.

This is **not** a static export. A running Next.js server is required for the `/api/*` routes, the IMAP cron, the Gmail OAuth flow, and the pipeline execution tool.

---

## AI-native platform primitives

This repository is structured as more than a chat demo. It shows how privacy operations can be built from governed AI-native primitives:

| Primitive | Location | What it proves |
|-----------|----------|----------------|
| Governed agents | `agents/agents.yaml` | Agents have roles, tool scopes, permission modes, output contracts, and memory boundaries. |
| Policy-as-code | `policies/` | Tool permissions, approval gates, and data classification can be enforced outside prompt text. |
| MCP server contracts | `mcp/` | Enterprise capabilities can be exposed as typed, auditable tools instead of hardwired app functions. |
| Connector SDK | `connectors/` | Customer systems can be adapted into a common privacy record model. |
| Agent traces | `docs/agent-trace-schema.md` | AI-assisted decisions can produce reviewer-ready evidence. |
| Human-approved execution | `src/lib/tools.ts` and `policies/approval-gates.yaml` | Side effects are gated by explicit approval and server-side checks. |

Read [docs/ai-native-architecture.md](docs/ai-native-architecture.md) for the platform model.

---

## Prerequisites

- **Node 18.17+** (Node 22 recommended). If your default Node is older:
  ```bash
  brew install node@22
  ```
- **AI provider API key** for Anthropic, OpenAI, or Gemini. Anthropic defaults to `claude-sonnet-4-6`; OpenAI/Gemini require an explicit `AI_MODEL`.
- **Postgres connection string** to the Supabase project that hosts the `dwh`, `crm`, `marketing`, `dealer_dms`, `vehicle_telematics`, and `naica_demo` schemas. Use the Direct or Session-pooler connection — the Transaction pooler will not work for migrations.
- **Python 3** (only if you need to run/create migrations).

---

## Setup

```bash
cd naica_demo_real_api_calls

# 1. Configure secrets — see the Environment section below
cp .env.local.example .env.local      # then edit

# 2. Install
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm install

# 3. Run
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run dev
```

Open <http://localhost:3000>. If your shell already has Node 18.17+ on PATH, drop the `PATH=...` prefix.

### Tests

The public repo includes a lightweight Node test suite for the AI-native platform contracts:

```bash
npm test
```

The tests cover the connector SDK example, the source-systems MCP scaffold, and policy/agent invariants such as read-only defaults, approval gates, and trace requirements.

### Environment (`.env.local`)

**Core (always required):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `AI_PROVIDER` | no | One of `anthropic`, `openai`, or `gemini`. Defaults to `anthropic`. |
| `AI_MODEL` | Anthropic no; OpenAI/Gemini yes | Model ID used by all server-side AI calls. Defaults to `claude-sonnet-4-6` only for Anthropic. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | yes, one matching provider | Used server-side by `/api/chat`, `/api/chat/privacy-hub`, the sub-agent runner, Operator Inbox handler, and AI-Gov helper. |
| `DATABASE_URL_FOR_ALEMBIC` | yes | Privileged Postgres URL. Read by `src/lib/db.ts` for the source-system tools, the `comm_coordinator.*` tables, and Alembic migrations. Server-side only — never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_CALENDLY_URL` | no | Override the Calendly link on the landing page. Defaults to the Instrata scheduling URL. |

**Live email loop (Tab 7 + 8 real send, Operator Inbox):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `SMTP_HOST` / `SMTP_PORT` | localhost only | e.g. `smtp.gmail.com` / `587`. Ignored in prod when Gmail API is on. |
| `SMTP_USER` / `SMTP_PASS` | localhost only | Gmail address + App Password. Sender identity for outbound. |
| `EMAIL_FROM_NAME` | no | Display name on outbound (default `"Izzy (Instrata)"`). |
| `EMAIL_OVERRIDE_TO` | no | Redirect ALL outbound to one address — useful when testing without mailing real people. |
| `IMAP_HOST` / `IMAP_PORT` | yes (for ingest) | `imap.gmail.com` / `993`. |
| `IMAP_USER` / `IMAP_PASS` | yes (for ingest) | Mailbox Izzy reads from. Must match the address recipients reply to. |
| `IZZY_EMAIL_ALLOWLIST` | yes (prod) | Comma-separated list of operator addresses authorized to email Izzy. Merged with `IZZY_EMAIL_ALLOWLIST_DEFAULT` in `src/lib/constants.ts`. Senders not on the list are skipped silently. |
| `CRON_SECRET` | yes (prod) | Bearer token required by `POST /api/cron/ingest-replies`. |

**Gmail HTTPS API (prod — Railway blocks SMTP egress so Gmail API is mandatory):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `GMAIL_CLIENT_ID` | prod | From Google Cloud Console → OAuth 2.0 Client ID (Web application). |
| `GMAIL_CLIENT_SECRET` | prod | Same client's secret. |
| `GMAIL_REFRESH_TOKEN` | prod | Captured once via `/api/oauth/gmail/start`. Doesn't expire unless explicitly revoked. |
| `GMAIL_USER_EMAIL` | prod | The mailbox sending mail (e.g. `izzy@example.com`). |
| `OAUTH_REDIRECT_URI` | prod | Exact redirect URI registered in Cloud Console (e.g. `https://your-domain.example/api/oauth/gmail/callback`). Overrides forwarded-header derivation. |

**Pipeline execution:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `PIPELINE_OUTPUT_DIR` | no | Where real `.pptx` files generated by `execute_post_approval_pipeline` land. Defaults: `~/Documents/Instrata/` (localhost), `/tmp/instrata-pptx` (prod). |

Transport is auto-selected by `src/lib/email/smtp.ts:sendEmail()` — Gmail API path if `GMAIL_REFRESH_TOKEN` is set, else nodemailer SMTP. Localhost can use either path; prod must use Gmail API.

**One-time Gmail OAuth (prod):**

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application) with redirect URI `https://your-domain.example/api/oauth/gmail/callback`.
2. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `OAUTH_REDIRECT_URI` in env and redeploy.
3. Visit `/api/oauth/gmail/start` → Google consent → callback page renders `GMAIL_REFRESH_TOKEN`.
4. Add the token to env and redeploy. Done. Add `?debug=1` to `/api/oauth/gmail/start` to print the exact `redirect_uri` for byte-comparison with Cloud Console.

### Database migrations (optional)

The schema is managed by Alembic in `migrations/`. If you are bringing up a fresh Supabase project:

```bash
cd migrations
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic -c alembic.ini upgrade head
```

The Alembic version table lives at `naica_demo.alembic_version` so it does not collide with other Alembic projects in the same database.

---

## Pages

| Route | Audience | What it is |
|-------|----------|------------|
| `/` | Buyer/visitor | Cinematic landing page with scroll-driven dolly hero and embedded Calendly. |
| `/demo` | Operator (Margaret/Henry) | The two-pane workflow + agent demo. **The main thing.** |
| `/intake` | Consumer | Public privacy-rights submission form that writes to `naica_demo.intake_requests`. |
| `/tools/privacy-hub` | Privacy professional | Separate provider-backed hub for state-law lookup and LLM privacy-policy Q&A. Self-contained under `src/features/privacy-hub/`. |

---

## The demo: how to drive it

`/demo` opens on **Scenario 1 · Happy Path**. To walk a stakeholder through it:

1. **Click each scenario tab** at the top of the workflow pane (eight total — see table below). Each tab loads a different `REQ-*` and seeds the agent with a proactive opening message that frames what the engine just did.
2. **Use the chat pane** on the right. Each scenario surfaces 3–4 **suggested queries** as clickable chips — these are the curated demo path. Free-form questions also work.
3. **Toggle layout modes** from the header:
   - **Split** (default) — 65% workflow / 35% agent
   - **Full UI** — workflow only, agent collapsed to icon strip
   - **Full Agent** — agent only, workflow collapsed
   Click a collapsed strip to return to Split.
4. **Watch tool-call bubbles** in the chat. Each bubble is proof the agent is reading from real Postgres or invoking a sub-agent — not improvising.

### The 8 scenarios

| Tab | Request | Consumer | What to demo |
|-----|---------|----------|--------------|
| 1 · Happy Path | REQ-001 | Maria Chen (CA, RTK) | Reference shape — three 5/5 matches across DWH/CRM/sales, no exemptions, end-to-end without a human judgment call. |
| 2 · CAN-SPAM Conflict | REQ-010 | David Brown (TX, delete) | State delete vs. federal CAN-SPAM 16 CFR 316.5 retention — engine deletes profile but preserves the suppression-evidence row through 2029. |
| 3 · Namesake Collision | REQ-016 | John Brown (TX, RTK) | Two real John Browns. Engine excludes the FL one with explicit reasoning, recorded in audit, before wrongful disclosure. |
| 4 · Multi-Jurisdictional | REQ-015 | Thomas Wilson (CA) + Linda Wilson (VA) | One DSAR, two statutes. Per-record law: CCPA full-delete on his sole-owner records, VCDPA-aware mask on shared household records. |
| 5 · Coded Fields | REQ-009 | Karen Lee (CT, RTK) | Eight demographic codes decoded automatically — §1798.110 / CTDPA inference-disclosure conformance. |
| 6 · Audit Trail | REQ-003 | James Williams (CT, opt-out) | Completed request — picks CTDPA Section 6(a), confirms vendor-notification window, GPC honored. Litigation-defense artifact. |
| 7 · Orphan VIN | REQ-VIN-001 | John Brown (orphan VIN) | **Live Coordinator multi-turn.** Outbound #1 to Sylvia (Legacy CRM) → real reply redirects to Eric Park (Dealer Network Archives) → Izzy auto-drafts outbound #2 using lifted tokens → Eric names Kenji Fukushima → operator approves attribution. Real SMTP/IMAP loop; canned-reply fallback button for offline demos. |
| 8 · Consumer Reply | REQ-MC-REPLY | Maria Chen (DSAR reply) | **Live Coordinator multi-turn + 4-agent cascade.** DSAR confirmation → ambiguous reply → Izzy clarification → maiden-name reply → 4 sub-agents fan out in parallel (identity-resolver, disposition-planner, report-generator, consumer-reply-drafter) → bundled approval with 4-of-4 read-attestation gate. |

Scenario labels, proactive openers, suggested queries, and the "moment" the rail focuses on are configured in `src/lib/constants.ts`.

---

## Architecture

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router, TypeScript, Tailwind |
| AI | Provider-neutral adapter over `@anthropic-ai/sdk`, `openai`, and `@google/genai`; streaming + sub-agent runner |
| Data | Postgres (Supabase) for source systems + `comm_coordinator.*` tables + intake; static JSON in `src/data/` for the curated pipeline-state fixtures (matches, audit, replies, cipher legend, compliance rules) |
| Email | Nodemailer SMTP on localhost; Gmail HTTPS API in prod (Railway blocks SMTP egress). Auto-selected by `src/lib/email/smtp.ts`. |
| PPTX | `pptxgenjs` writes real `.pptx` files to `PIPELINE_OUTPUT_DIR` |
| Migrations | Alembic (Python) under `migrations/` |
| State | `DemoContext` (scenario + layout mode) + Operator Inbox drawer |
| Animation | `framer-motion` for hero/transitions |

### Read-only by design — with one guarded exception

The configured AI provider has ~30 tools defined in `src/lib/tools.ts`. **All but one are read-only.**

**Pipeline-overview tools** (over the curated fixtures):
`get_open_requests`, `get_request_details`, `get_at_risk_requests`, `get_pending_reviews`, `get_audit_trail`, `get_coded_field_meaning`, `summarize_disposition_plan`, `find_requests_by_consumer`, `get_replies`, `get_pending_consumer_replies`, `get_record_detail`, `get_state_rule`.

**Source-system probes** (live Postgres across DWH/CRM/marketing/dealer DMS/telematics + the demo intake table):
`find_party_by_email`, `find_party_by_phone`, `find_party_by_name`, `find_party_by_vin`, `get_party_360`, `decode_inferred_attributes`, `list_intake_requests`.

**VIN + Communications Coordinator** (Tabs 7 + 8):
`expand_vins_for_consumer`, `search_vin_keyed_records`, `get_orphan_vins`, `get_communication_case`, `parse_inbound_reply`, `draft_outreach`.

**Sub-agent meta-tools** — each spawns a focused sub-agent with its own system prompt and a strict subset of tools; the parent only sees the final summary:
`resolve_identity`, `plan_disposition`, `generate_compliance_report`, `draft_inference_disclosure`.

**The single execution tool** — `execute_post_approval_pipeline` — is the only tool that crosses the read-only boundary, and **it now does real work**: generates a real `.pptx` via `pptxgenjs` saved to `PIPELINE_OUTPUT_DIR`, then sends it via SMTP (localhost) or Gmail HTTPS API (prod) with the deck attached.

It is gated by **exactly two phrases**, enforced by `isValidApprovalPhrase()` server-side: `"I approve this action"` (singular) or `"I approve these actions"` (plural). Case-insensitive, trailing punctuation tolerated. Any other `authorization_quote` is rejected at the tool boundary *before* the pipeline runs — defending against the model fabricating a quote. Recipient names like `"margaret"` / `"henry"` / `"legal"` resolve through `PIPELINE_RECIPIENT_DIRECTORY` in `tools.ts`. Live-intake `REQ-1xxxxx` IDs resolve through `loadRequestForReport()` in `src/lib/pptx/generate-report.ts` (checks both seed JSON and `naica_demo.intake_requests`).

**Do not add additional write/delete/notification tools to `TOOL_DEFINITIONS`.** New side effects must go through the same approval-phrase pipeline pattern, or live behind a UI-driven route handler.

### Communications Coordinator — live email loop (Tabs 7 + 8)

Tabs 7 and 8 run real outbound and real inbound mail. Outbound goes through `POST /api/coordinator/messages/[id]/send` → `src/lib/email/smtp.ts:sendEmail()` (Gmail API or nodemailer). Inbound is pulled by `src/lib/email/imap.ts:ingestReplies()` — invoked by either the scheduled cron at `POST /api/cron/ingest-replies` (bearer-auth via `CRON_SECRET`) or the manual `POST /api/operator-inbox/poll` button in the drawer.

Triage logic: `In-Reply-To` header → falls back to subject regex → falls back to "new operator inquiry" when the sender is on `IZZY_EMAIL_ALLOWLIST`. New operator inquiries spawn a `CASE-ASK-*` case in `comm_coordinator.cases` with application = `operator_inquiry`. Multi-turn follow-ups re-fire the handler with prior-thread context so Izzy can resolve references like "the PowerPoint."

Per-case endpoints (`/api/coordinator/cases/[caseId]/...`): `reset` clears outbound sent_at + deletes inbounds; `simulate-reply?turn=1|2` inserts a canned inbound for offline / no-IMAP demos.

### Operator Inbox — Izzy answers emails async

The mailbox icon in the demo header opens the **Operator Inbox drawer** (`src/components/operator-inbox/InboxDrawer.tsx`). Authorized humans (per `IZZY_EMAIL_ALLOWLIST`) email `izzy@example.com`; the IMAP triage routes through `src/lib/sub-agents/operator-inquiry-handler.ts:runOperatorInquiryHandler` which gives Izzy the chat TOOL_DEFINITIONS surface *plus* `execute_post_approval_pipeline`. She replies via the same transport router. Recovery script for handler errors: `scripts/retry_stuck_operator_inquiries.ts`.

Izzy's own address is **deliberately not on the allowlist** to prevent self-reply loops.

### Key files

```
src/app/page.tsx                  Landing page (dolly hero + Calendly)
src/app/demo/page.tsx             Operator demo entry
src/app/intake/page.tsx           Public privacy-rights form
src/app/tools/privacy-hub/        Standalone Privacy Hub UI
src/app/api/chat/route.ts         Main AI streaming + tool loop (Izzy chat)
src/app/api/chat/privacy-hub/     Privacy-hub chat route
src/app/api/intake/route.ts       POST handler for /intake submissions
src/app/api/pipeline/run/route.ts Pipeline execution endpoint (SSE)
src/app/api/requests/             Read APIs over the curated request set

src/app/api/coordinator/case/                       GET case + messages + facts
src/app/api/coordinator/messages/[id]/send          POST → real SMTP/Gmail-API send
src/app/api/coordinator/messages/[id]/parse         POST → run inbound-parser sub-agent
src/app/api/coordinator/cases/[id]/reset            POST → clear outbound + delete inbounds
src/app/api/coordinator/cases/[id]/simulate-reply   POST → insert canned inbound
src/app/api/cron/ingest-replies/route.ts            POST (bearer) → IMAP poll + Izzy handler
src/app/api/operator-inbox/route.ts                 GET threads for the drawer
src/app/api/operator-inbox/poll/route.ts            POST (no auth) → manual IMAP poll
src/app/api/oauth/gmail/start/route.ts              GET → Google consent redirect
src/app/api/oauth/gmail/callback/route.ts           GET → token exchange + refresh_token display

src/context/DemoContext.tsx       Scenario + layout-mode state
src/components/demo/              DemoLayout, LayoutToggle, ScenarioTabs, WorkflowPane
src/components/agent/             AgentPanel, AgentMessage, ToolCallBubble, AgentInput,
                                  PipelineExecutionBubble, ActionConfirmModal,
                                  ArtifactPreviewModal
src/components/coordinator/       TurnCards, CascadeBundleReview, CoordinatorAuditChain,
                                  useCoordinatorCase, IzzyPersona (shared by Tabs 7 + 8)
src/components/operator-inbox/    InboxButton, InboxDrawer (Operator Inbox UI)
src/components/requests/RequestDetail/   Per-stage views (Search, Score, AgentResolution,
                                          DecodedDataTable, RulesApplied, DispositionPlan,
                                          ReportPreview, ApproveRejectPanel, AuditTrail,
                                          OrphanInvestigationView, ConsumerReplyReviewView)
src/components/intake/IntakeForm.tsx     Public intake form
src/components/onboarding/TourOverlay.tsx Guided tour for first-time visitors

src/hooks/useAgent.ts             Streaming fetch + tool-call tracking
src/hooks/useRealPipeline.ts      Drives the per-stage pipeline animation
src/hooks/useLiveMatches.ts       Reads matches for live (intake-originated) requests
src/hooks/useLiveRequest.ts       Reads a single live request

src/lib/ai/                       Provider-neutral AI layer for Anthropic, OpenAI,
                                   and Gemini adapters + shared tool loops
src/lib/tools.ts                  Public facade for tool definitions, executeTool(),
                                   and approval phrase validation
src/lib/tools/                    Tool runtime internals, approval policy, and
                                   guarded execution pipeline
src/lib/system-prompt.ts          Izzy's chat system prompt
src/lib/shared-output-rules.ts    Shared output style rules (parent + sub-agents)
src/lib/constants.ts              Scenario config + IZZY_EMAIL_ALLOWLIST_DEFAULT
                                   + getIzzyEmailAllowlist() / isAllowedEmailSender()
src/lib/data.ts                   Loaders + selectors over src/data/*.json
src/lib/db.ts                     Postgres pool (server-only)
src/lib/db-queries.ts             Cross-schema find_party_* / get_party_360 queries
src/lib/data-sources.ts           Source-system metadata
src/lib/coordinator-db.ts         comm_coordinator.* helpers — case + message inserts,
                                   operator_inquiry case creation, thread loaders
src/lib/email/smtp.ts             Transport router — Gmail API if GMAIL_REFRESH_TOKEN set,
                                   else nodemailer SMTP
src/lib/email/gmail-api.ts        Gmail HTTPS API send via OAuth2 refresh token
src/lib/email/imap.ts             IMAP triage — case match / allowlist / handler dispatch
src/lib/pptx/generate-report.ts   pptxgenjs 5-slide report + loadRequestForReport()
                                   (intake-aware: checks seed JSON and naica_demo.intake_requests)
src/lib/sub-agents/               runner.ts + 6 sub-agent definitions:
                                   identity-resolver, disposition-planner,
                                   report-generator, inference-disclosure,
                                   inbound-parser, consumer-reply-drafter,
                                   operator-inquiry-handler

src/features/privacy-hub/         Self-contained Privacy Hub feature
                                  (components, hooks, lib/tools, lib/system-prompt, data)

src/data/*.json                   Curated fixtures: requests, matches, audit_trail,
                                  replies, records, cipher_legend, compliance_rules,
                                  communication_cases / messages / extracted_facts,
                                  vin_keyed_records, orphan_vins, vin_demo_records
migrations/                       Alembic project (env.py, alembic.ini, versions/)
scripts/                          Migration helpers + smoke tests + recovery:
                                   resync_coordinator_seed.ts, migrate_*.ts,
                                   retry_stuck_operator_inquiries.ts
docs/                             Internal notes (seed_data_edge_cases, what_ai_agent_can_do)
```

---

## Sub-agents

Each entry in `src/lib/sub-agents/` is a focused model-backed worker that runs inside `runSubAgent` with its own system prompt and a strict tool whitelist. Parent-callable agents are reached via meta-tools; server-side agents are invoked directly by route handlers. Sub-agents cannot recurse — meta-tools are not in any sub-agent's whitelist.

| Sub-agent | Triggered by | What it produces |
|-----------|--------------|------------------|
| `identity-resolver` | `resolve_identity` meta-tool, or the Tab 8 cascade | Cross-system stitched identity summary from a free-text hint (email/phone/name/VIN/sentence). |
| `disposition-planner` | `plan_disposition` meta-tool, or the Tab 8 cascade | Per-record disposition with statutory citations. |
| `report-generator` | `generate_compliance_report` meta-tool, or the Tab 8 cascade | Full regulator-ready PRIVACY COMPLIANCE REPORT. |
| `inference-disclosure` | `draft_inference_disclosure` meta-tool | Customer-facing INFERENCES section of a Right-to-Know letter. |
| `inbound-parser` | `POST /api/coordinator/messages/[id]/parse` (auto-fired on fresh inbound) | Classification (`provides_attribution` / `provides_redirect` / `provides_new_identity_info` / `ambiguous`) + extracted facts + candidate matches. Fans out the 4-agent cascade when classification = `provides_new_identity_info` on a `consumer_dsar` case. |
| `consumer-reply-drafter` | The Tab 8 cascade | SMTP-ready `{subject, body}` reply to the consumer that summarizes the disposition. |
| `operator-inquiry-handler` | `src/lib/email/imap.ts:ingestReplies` for any allowlisted email to `izzy@example.com` | JSON `{subject, body}` reply email. Whitelist is chat TOOL_DEFINITIONS *plus* `execute_post_approval_pipeline` — so emails like "create a PowerPoint and email it to Margaret. I approve this action" actually execute. |

---

## Troubleshooting

- **`Error: Next.js requires Node.js >= 18.17`** — your default Node is too old. Prefix the command with `PATH="/opt/homebrew/opt/node@22/bin:$PATH"` or `nvm use 22`.
- **Provider auth errors** — `.env.local` is missing, `AI_PROVIDER` does not match the key you set, or the matching provider key is wrong. The file must be at the project root (next to `package.json`).
- **`DATABASE_URL_FOR_ALEMBIC is not set`** — source-system tools (`find_party_by_*`, `get_party_360`), the `/api/intake` route, and all `comm_coordinator.*` reads need this. Add it to `.env.local` and restart the dev server.
- **Postgres SSL / cert errors** — the pool is already configured with `rejectUnauthorized: false` for Supabase. If you swap hosts, make sure the new connection string still uses the Direct or Session-pooler endpoint, not the Transaction pooler.
- **Empty chat / no streaming** — check the dev-server terminal for errors from `/api/chat`. Verify the configured provider key and `AI_MODEL` are valid.
- **Port 3000 in use** — `PORT=3001 npm run dev`.
- **`Connection timeout` when sending email** — Railway (and most prod hosts) blocks outbound SMTP egress on 25/465/587. Switch to the Gmail HTTPS API path by setting `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` / `GMAIL_USER_EMAIL`; the transport router in `src/lib/email/smtp.ts` will auto-route through HTTPS.
- **Email to izzy not processed** — check three things: (1) `IZZY_EMAIL_ALLOWLIST` includes the sender's address; (2) `IMAP_USER` is the mailbox the sender actually mailed (e.g. `izzy@example.com`); (3) the IMAP cron is running or you clicked **Poll for new mail** in the Operator Inbox drawer. Senders not on the allowlist are silently dropped with reason `"no case match — sender not authorized — left unread"`.
- **`redirect_uri_mismatch` on `/api/oauth/gmail/start`** — the redirect URI the route is computing doesn't byte-match what's in Google Cloud Console. Set `OAUTH_REDIRECT_URI` in env to override forwarded-header derivation. Add `?debug=1` to the start route to print the exact URI being sent.
- **`invalid_grant` from Gmail API** — the refresh token was revoked (or never granted offline access). Visit `/api/oauth/gmail/start` again, grant consent, copy the new `GMAIL_REFRESH_TOKEN`, redeploy.
- **`execute_post_approval_pipeline` rejected with "Invalid approval phrase"** — the model fabricated an `authorization_quote` that doesn't match `"I approve this action"` / `"I approve these actions"`. The regex in `isValidApprovalPhrase()` is intentional and strict. Tell the operator (or Izzy) to use the exact phrase.
- **Stuck operator-inquiry case (inbound but no outbound)** — handler errored on first run. `npx tsx scripts/retry_stuck_operator_inquiries.ts --list` to inspect; `--all` to retry every stuck case.

---

## Modifying the demo

- **Scenario labels, openers, suggested queries, focused-stage** — `src/lib/constants.ts`.
- **Curated request data** — `src/data/*.json`. The eight active scenarios use REQ-001, REQ-003, REQ-009, REQ-010, REQ-015, REQ-016, REQ-VIN-001, REQ-MC-REPLY.
- **Coordinator seed data** — `src/data/communication_*.json` is the backfill source for the live `comm_coordinator.*` Postgres tables. Run `scripts/resync_coordinator_seed.ts` after edits to push to pg.
- **VIN data** — `src/data/vin_keyed_records.json`, `orphan_vins.json`, `vin_demo_records.json`.
- **Source-system data** — Postgres. Edit through Supabase or add a new Alembic revision under `migrations/versions/`.
- **Agent behavior / tone** — `src/lib/system-prompt.ts` and `src/lib/shared-output-rules.ts`.
- **Sub-agent prompts** — `src/lib/sub-agents/prompts.ts` (includes `SYSTEM_PROMPT_OPERATOR_INQUIRY` for email-mode Izzy).
- **Operator email allowlist** — `IZZY_EMAIL_ALLOWLIST_DEFAULT` in `src/lib/constants.ts`, plus optional env override `IZZY_EMAIL_ALLOWLIST` (comma-separated).
- **Pipeline recipient directory** — `PIPELINE_RECIPIENT_DIRECTORY` in `src/lib/tools.ts` maps friendly names (`"margaret"` / `"henry"` / `"legal"`) to actual addresses. Add new recipients here.
- **PPTX template** — `src/lib/pptx/generate-report.ts` (5-slide deck via `pptxgenjs`).
- **Tool surface** — `src/lib/tools.ts` facade plus `src/lib/tools/` internals. Read-only additions are fine. Anything with a side effect must route through `execute_post_approval_pipeline`'s approval-phrase pattern, or live behind a UI-driven route handler.
