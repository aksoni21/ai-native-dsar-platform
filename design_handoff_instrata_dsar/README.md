# Handoff: Instrata AI — Open-source AI-native privacy ops (DSAR workflows)

## Overview
A marketing site + product-UI prototype for **Instrata AI**, an open-source, AI-native privacy operations product for DSAR (Data Subject Access Request) workflows: Right to Know, Access My Data, Delete My Data, and Correction requests.

The core product idea, which the UI must communicate everywhere: **governed AI agents assist privacy teams (intake → search → reason → evidence), but never perform a side effect on their own.** Every external action (email, export, deletion) is approval-gated behind a human, and every step is written to an immutable audit trail.

The package contains 5 screens:
1. **Homepage** — product overview / marketing.
2. **Demo** — a single DSAR under operator review (the flagship product screen).
3. **Intake** — consumer-facing privacy-request form.
4. **Dashboard** — operator request queue.
5. **Docs** — architecture / how-it-works.

## About the Design Files
The files in `design_files/` are **design references authored as HTML** — prototypes that show the intended look and behavior. They are **not production code to copy directly**. They are written as "Design Components" (a streaming HTML format): the markup is standard HTML with **inline styles**, and each page's logic lives in a `class Component` with a `renderVals()` method that returns the data, computed styles, and event handlers the template binds to.

Your task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, etc.) using its established component and styling patterns. If no frontend environment exists yet, choose the most appropriate framework and implement there. The `renderVals()` logic maps almost 1:1 to a React component's state + handlers; inline styles map 1:1 to your styling system (CSS modules, Tailwind, styled-components).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are all specified below and should be reproduced faithfully. All product interactions are currently **mocked** with hardcoded data and client-side state — see **State Management** for where real APIs must be wired in.

---

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `ink` | `#12141C` | Primary text, dark sections, logo mark |
| `ink-2` (footer bg) | `#0E1017` | Footer, darkest surface |
| `ink-soft` | `#171A24` | Dark-surface cards (on `#12141C`/`#0E1017`) |
| `ink-border` | `#262A36` / `#1B1E27` | Borders on dark surfaces |
| `text-body` | `#464C5C` | Body paragraphs |
| `text-secondary` | `#3A4152` | Nav links, secondary body |
| `text-muted` | `#6B7280` | Muted copy |
| `text-faint` | `#8A90A0` | Timestamps, labels, placeholders |
| `bg` | `#FBFBFD` | Page background (light) |
| `bg-alt` | `#F5F6FA` | Alternating section bg, app-shell bg |
| `panel` | `#FFFFFF` | Cards / panels |
| `line` | `#E6E8EF` | Default border |
| `line-soft` | `#EEEFF4` / `#F0F1F5` / `#F4F5F9` | Inner dividers / table rows (lightest) |
| **`accent`** | **`#2F6BFF`** | **Electric blue — primary CTA, active, links, highlights** |
| `accent-dark` | `#1E4FD6` | CTA hover, accent text on light |
| `accent-tint` | `#EEF3FF` | Accent chip background |
| `accent-tint-border` | `#D8E4FF` | Accent chip border |
| `accent-on-dark` | `#7FA5FF` | Accent text on dark surfaces |
| `success` | `#17936B` | Approved / verified; hover `#127857` |
| `success-tint` / `-border` | `#E7F6EF` / `#CDEBDD` | Success chip |
| `success-on-dark` | `#5FD3A6` | Success on dark |
| `warn` | `#B7791F` (text `#8A6212`) | SLA / pending / gate |
| `warn-tint` / `-border` | `#FBF2E1` / `#F0E0BC` | Warn chip |
| `warn-on-dark` | `#E0A64B` | Warn on dark |
| `danger` | `#C0392B` (text `#A5342A`) | Overdue / reject |
| `danger-tint` / `-border` | `#FBEAE7` / `#EAD3CF` | Danger chip |

Links: default `#2F6BFF`, hover `#1E4FD6`. Text selection: `#D8E4FF`.

### Typography
- **UI / headings:** `Figtree` (weights 400/500/600/700/800), fallback `system-ui, -apple-system, sans-serif`.
- **Mono / technical:** `IBM Plex Mono` (400/500/600) — used for IDs, timestamps, tool-call names, code, eyebrow labels, small stat numbers, badges.
- Loaded via Google Fonts CDN in the prototypes; **self-host both families** in production.
- Antialiasing: `-webkit-font-smoothing: antialiased`.

Type scale (px / weight / letter-spacing):
- Hero H1: `52 / 800 / -.028em`, line-height `1.04`, `text-wrap: balance`.
- Section H2: `36 / 800 / -.02em`, line-height `1.1`.
- Sub-section H2 (docs): `23 / 800 / -.015em`.
- Page H1 (intake/dashboard): `27–32 / 800 / -.02em`.
- Lead paragraph: `17–18.5 / 400`, line-height `1.5–1.6`, color `#464C5C`.
- Body: `13.5–15 / 400–500`.
- Eyebrow label: `12.5 / 600`, `letter-spacing .04em`, `text-transform: uppercase`, IBM Plex Mono, color `#2F6BFF` (or `#7FA5FF` on dark).
- Small caps label: `11 / 600–700`, `letter-spacing .05–.06em`, uppercase, color `#8A90A0`.

### Spacing / Radius / Shadow
- Section vertical padding: `76–84px`. Content max-width: `1200px` (marketing) / `1320–1360px` (app shells). Horizontal gutter: `28–32px`.
- Border radius: pills `999px`; chips/badges `6–8px`; buttons/inputs `9–11px`; cards `13–16px`; large CTA panels `16–20px`.
- Card shadow (elevated): `0 24px 60px -28px rgba(18,20,28,.28), 0 2px 8px rgba(18,20,28,.05)`.
- CTA shadow: `0 2px 8px rgba(47,107,255,.28)`.
- Focus ring (inputs): `border-color:#2F6BFF; box-shadow:0 0 0 3px rgba(47,107,255,.14)`.

### Keyframes
- `livepulse` (1.8s infinite): "LIVE" status dots — scale 1→.82 + opacity 1→.35→1.
- `rowin` (.4–.5s): audit/activity rows fade+translateY(6px→0) on mount.

### Reusable primitives (build these once)
- **Logo mark:** 24–26px rounded square (`#12141C` on light / `#fff` on dark) containing an 10–11px rounded square in accent, rotated 45°.
- **Chip/Badge:** small pill, `{tint} bg + {tint-border} border + {color} text`, `3px 9px` padding. Variants: accent (type), success (verified/approved), warn (SLA/gate), danger (reject), neutral (`#F0F1F5`/`#E2E4EC`/`#3A4152`).
- **Button — primary:** accent bg, white text, `10–14px` padding, radius `9–11px`, CTA shadow, hover `#1E4FD6`.
- **Button — secondary:** white bg, `#12141C` text, `1px #D9DCE6` border, hover border `#12141C`.
- **Button — dark:** `#12141C` bg, white text (GitHub CTA).
- **Card / panel:** white, `1px #E6E8EF`, radius `14px`.
- **Audit row:** `[timestamp mono] [tag badge] [text]`, divider `#F4F5F9`.

---

## Screens / Views

### 1. Homepage (`design_files/Homepage.dc.html`)
**Purpose:** Communicate the product and immediately show the real UI (not a generic marketing page).

**Layout:** Sticky translucent nav; centered `max-width:1200px` sections, `32px` gutters.
- **Nav:** logo + links (Product, Governance, Docs → `Dashboard.dc.html`); right side GitHub (secondary btn) + "View the Demo" (primary btn). Background `rgba(251,251,253,.82)` + `backdrop-filter: blur(10px)`, bottom border `#E6E8EF`.
- **Hero:** 2-col grid `1.02fr 1.15fr`, gap `56px`, `72px` top padding.
  - Left: eyebrow pill "OPEN SOURCE · APACHE-2.0" (green dot); H1 "Open-source AI-native privacy ops for DSAR workflows"; sub "Governed AI agents that help privacy teams intake, search, reason, evidence, and approve DSAR work — without losing auditability or control."; primary "View the Demo →" + secondary "★ Explore on GitHub"; 3 check items (Human-in-the-loop by default / Full evidence & audit trail / No side effects without approval).
  - Right: **live stylized operator dashboard mock** in an elevated card — window bar (3 dots, "instrata · operator", pulsing LIVE dot); request header (DSAR-2041, "Right to Know" chip, "SLA · 6d left" warn chip, "Dana Whitfield · dana.w@example.com", "California (CCPA) · identity verified"); Agent activity (`search()` → 3 matches, match note); source badges (Billing·1, CRM·1, Support·1, Marketing·low dashed); approval-gate footer ("Proposed action · Compile disclosure package", "GATE" chip, green "Approve").
  - Radial glow behind card: `radial-gradient(120% 90% at 80% 0%, #EEF3FF, transparent 60%)`.
- **Trust strip:** top+bottom hairline row, IBM Plex Mono: "Built for:" CCPA/CPRA, GDPR, Right to Know, Delete My Data, Correction, Access requests.
- **Problem section:** eyebrow "The problem"; H2 "DSAR work is slow because the data is everywhere"; paragraph; 3 stat cards (45 days / 6–12 / 100%) each with mono number + caption.
- **Product walkthrough** (`#product`, bg `#F5F6FA`): eyebrow "How it works"; H2 "From consumer request to approved action"; 3×2 grid of 6 numbered step cards. Steps 1,2,5 use dark number badge + gray role label; steps 3,4 use accent badge + accent label; **step 6 is a full dark card** (`#12141C`) with green badge — "A human approves".
- **Capabilities:** eyebrow "Capabilities"; H2; 2-col bordered grid of 10 items (numbered `01`–`10` in accent tile + title + desc). Content = the 10 capabilities list (see below).
- **Governance** (`#governance`, **dark** `#12141C`): 2-col. Left: eyebrow (accent-on-dark), H2 "The agent assists. It never acts on its own.", paragraph, 3 check rows. Right: audit-trail card (`#171A24`) with 5 rows (intake/verify/tool/reason/gate).
- **Demo CTA:** bordered gradient panel (`#F4F8FF → #fff`), 2-col: copy + "Launch the demo →" / "Try the intake form"; right = 3 numbered step chips.
- **Open source** (bg `#F5F6FA`): 2-col; copy + "★ Explore on GitHub" (dark btn) / "Read the architecture"; right = dark code block (`registerConnector(...)`, syntax-colored).
- **Footer** (`#0E1017`): 4-col — brand blurb; Product (Demo, Operator dashboard, Intake portal); Resources (Documentation, GitHub, License · Apache-2.0); Company (Contact, Architecture). Bottom bar (mono): "© 2026 Instrata AI · Apache-2.0" / "Human-in-the-loop · No side effects without approval".

**The 10 capabilities (title — desc):**
1. DSAR intake portal — Branded consumer-facing form that captures request type, identity, and jurisdiction.
2. Operator request dashboard — A queue with status, SLA clock, type, reviewer, and verification at a glance.
3. Source-system search — Governed queries across connected billing, CRM, support, and marketing systems.
4. Agent tool-call visibility — Every tool the agent calls is shown inline and written to the log.
5. Match reasoning — Plain-language explanation of why each record matched — and confidence.
6. Audit trail & evidence log — Immutable record of inputs, calls, results, and human decisions.
7. SLA & status tracking — Deadline clocks and status transitions on every request.
8. Approval-gated actions — Exports, emails, and deletions require explicit human sign-off.
9. Human-in-the-loop controls — Operators can edit, reject, or request changes to any proposed action.
10. Open-source architecture — Inspect the orchestration, audit the tools, add your own connectors.

---

### 2. Demo (`design_files/Demo.dc.html`) — flagship product screen
**Purpose:** Show one DSAR (DSAR-2041, Right to Know) from search through the operator approval gate.

**Layout:** Dark app bar (`#12141C`) with breadcrumb (Instrata AI / Dashboard / DSAR-2041) + "DEMO · Right to Know" live indicator. Below: 3-col grid `300px 1fr 320px`, gap `22px`, `max-width:1360px`.
- **Left (sticky):** Request-details card (ID, "Right to Know" chip, name, email, jurisdiction, submitted date, "✓ Verified", "6 days left" SLA warn chip, reviewer=You) + Connected-sources card (Billing/CRM/Support green dots with counts; Marketing warn "low").
- **Center:** Agent panel card — header (agent avatar "A", "Privacy agent", "Governed · read-only tools · all actions gated", status chip). Conversation feed: operator message (dark bubble, right-aligned); agent tool-call block (`tool_call search_sources({email, last_name})` · `200 OK`, then a 3-row results table: Billing/CRM = high (success), Support = low (warn)); match-reasoning card; proposed-action note.
- **Right (sticky):** **Approval gate** card (border/head tint changes by phase) — title "Compile & deliver disclosure", description, 3 bullet facts, and phase-dependent controls. **Audit trail** card below (append-only, rows animate in).

**Interactions / State:** `phase ∈ {pending, approved, rejected}` (default `pending`).
- pending → shows "Approve action" (green), "Reject" (danger outline), "Request changes"; note "Nothing is sent until you approve."
- Approve → phase=`approved`: green success box "Approved & executed", appends 2 audit rows ("Operator approved · you", "Disclosure compiled · link emailed"), status chip → "Completed"; "Reset demo" button.
- Reject → phase=`rejected`: danger box "Rejected · No action taken", appends 1 audit row; "Reset demo".
- Reset → back to `pending`.
- Gate visual tokens by phase: border `#F0E0BC / #CDEBDD / #EAD3CF`, head bg `#FBF2E1 / #E7F6EF / #FBEAE7`, tag "Approval gate / Approved / Rejected".

---

### 3. Intake (`design_files/Intake.dc.html`) — consumer form
**Purpose:** Let a consumer file a privacy request; identity verified before any action.

**Layout:** White nav (logo + "🔒 Secure privacy request portal"). Main `max-width:1000px`, 2-col `1fr 300px`.
- **Form column:** eyebrow "Privacy request"; H1 "Submit a data privacy request"; lead. Form card contains:
  - **Request type:** 2×2 radio-card grid — Right to Know / Access My Data / Delete My Data / Correction (each title + sub). Selected card: border `#2F6BFF`, bg `#F4F8FF`, filled radio dot.
  - **Name** + **Email** (2-col text inputs).
  - **State/jurisdiction** (select: California CCPA/CPRA, Colorado CPA, Virginia VCDPA, Texas TDPSA, EU/UK GDPR, Other) + **Verification detail** (text, e.g. last-4 of account or order ID).
  - **Description** (optional textarea).
  - **Consent checkbox** (accent-color, required).
  - Error banner (danger) when invalid.
  - "Submit request" primary button (full-width).
- **Sidebar (sticky):** "What happens next" 3 numbered steps; note about 30–45 day statutory windows.

**Interactions / State:** fields `{type, name, email, stateSel, verify, desc, consent, submitted, showError, refId}`.
- Validation on submit: `name` non-empty AND email matches `/.+@.+\..+/` AND `consent` checked. Else show error banner.
- On success: `submitted=true`, generate `refId = 2042 + random(0–899)`; show success card ("Request submitted", reference "DSAR-{refId}", "See how it's reviewed →" → Demo, "Submit another" → reset).

---

### 4. Dashboard (`design_files/Dashboard.dc.html`) — operator queue
**Purpose:** Dense-but-readable queue for privacy teams.

**Layout:** Dark app bar (Requests / Docs / Overview, "+ New intake", "OP" avatar). Main `max-width:1320px`.
- **Title** "Request queue" + lead.
- **4 stat cards:** Open `7`, Awaiting approval `3` (warn), Due ≤ 7 days `2` (danger), Completed (30d) `41` (success).
- **Filter bar:** segmented buttons All / Awaiting approval / Agent searching / In review / Completed (active = `#12141C` bg, white); right side count "N of M requests".
- **Table:** columns `ID | Consumer | Type | Status | SLA | Reviewer | (open)` via grid `96px 1.6fr 1.1fr 1fr 1.1fr 1.2fr 92px`. Header row on `#FCFCFE`. Each row: mono ID; consumer name + "region · verify" subline; type chip (accent); status chip (color per status); SLA dot+text (danger ≤7d, warn ≤20d, else neutral-green dot); reviewer avatar+name; "Open" secondary button → Demo.

**Interactions / State:** `filter` (default "All"). Filtering maps each row's `bucket` to the active filter. 7 seed rows (DSAR-2041 … 2028) with statuses: Awaiting approval (warn), Agent searching (accent), In review (neutral), Completed (success). Row hover bg `#FCFCFE`.

---

### 5. Docs (`design_files/Docs.dc.html`) — architecture
**Purpose:** Explain how the open-source demo works.

**Layout:** Sticky nav; 2-col `220px 1fr`, gap `48px`.
- **TOC (sticky):** Overview, 1 Intake, 2 Orchestration, 3 Agent tools, 4 Connectors, 5 Evidence & audit, 6 Approval gates. Active/hover = accent text + accent left-border.
- **Content:** eyebrow "Architecture"; H1 "How the open-source demo works"; lead. **Pipeline diagram** (dark `#12141C` card, `data-om-raster` for export): 4 nodes Intake → Orchestration → Agent tools → Approval gate (last node green-tinted), footer "Every step writes to the evidence & audit layer".
- **6 numbered sections** (each: number tile, H2, paragraph, plus either a bullet list or a dark code block). Content:
  1. Intake — request record / SLA clock / queue placement (list).
  2. Request orchestration — plan of read-only steps (code block: `orchestrate(request)` → verify → search → reason → propose (gated)).
  3. Agent tools — read-only vs side-effecting typing (list: `search_sources()`, `reason_matches()`, `propose_action()`).
  4. Source-system connectors — connector interface (code block: `registerConnector("crm", { search, sideEffects:"gated", audit:true })`).
  5. Evidence & audit layer — append-only / attributed / exportable (list).
  6. Approval gates — gate in front of every side effect (code block: `action.status="proposed"` → `if operator.approves → execute + audit.append`).
- **Green callout:** "No side effects without human approval". Bottom CTAs: "See it in the demo →", "★ Read the source".

---

## Interactions & Behavior (summary)
- **Navigation:** all inter-page links use relative hrefs today (`Demo.dc.html`, etc.). Replace with your router routes (e.g. `/demo`, `/intake`, `/dashboard`, `/docs`).
- **Hover states:** buttons darken (primary → `#1E4FD6`, success → `#127857`) or gain `#12141C` border (secondary); table rows tint `#FCFCFE`; TOC links go accent.
- **Focus states:** inputs get accent border + 3px accent-alpha ring.
- **Animations:** `livepulse` on LIVE dots; `rowin` on audit/activity rows.
- **Approval gate & form flows:** see per-screen State sections.
- **Responsive:** prototypes are desktop-first at the listed widths. Define breakpoints for your app — collapse hero/2-col grids to single column, make the Demo 3-col stack, and allow the Dashboard table to scroll-x or reflow to cards on narrow viewports.

## State Management
Everything is currently mocked client-side. For production, wire:
- **Intake:** POST the form to your DSAR intake API; return the real request ID for the confirmation screen.
- **Dashboard:** fetch the request queue (id, consumer, region, verification, type, status/bucket, SLA days remaining, reviewer); filters can be client- or server-side.
- **Demo:** fetch a single request + its agent activity (tool calls, results, reasoning) + audit trail; the Approve/Reject/Request-changes actions call your orchestration/approval API and re-fetch (or optimistically append) the audit trail. **The agent tools must be genuinely read-only; every side effect stays gated behind the human approval call** — this is the product's core guarantee, keep it enforced server-side, not just in the UI.
- **Stat cards & counts:** derive from the queue data.

## Assets
- **No raster images or custom icon set** — all iconography is CSS shapes, unicode glyphs (✓ ✕ → ★ • 🔒), and the CSS logo mark. Replace the ★ GitHub glyph and 🔒 with your real icon library if desired.
- **Fonts:** Figtree + IBM Plex Mono (Google Fonts in the prototype; self-host in prod).
- The Docs pipeline diagram is CSS-only and marked `data-om-raster` (a prototype export hint — ignore it in code).

## Files
- `design_files/Homepage.dc.html` — marketing homepage
- `design_files/Demo.dc.html` — operator DSAR review + approval gate
- `design_files/Intake.dc.html` — consumer intake form
- `design_files/Dashboard.dc.html` — operator request queue
- `design_files/Docs.dc.html` — architecture / how-it-works

Each file: standard HTML markup with inline styles in the `<x-dc>` template, plus a `class Component { renderVals() { … } }` block holding the data/handlers. Read `renderVals()` for the exact seed data, computed style maps, and event logic per screen.
