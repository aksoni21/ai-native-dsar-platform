/**
 * Universal output-formatting rules applied to every model-backed system prompt that
 * emits chat-rendered Markdown — the main agent and the chat-rendered
 * sub-agents (identity, disposition, report). Letter-format deliverables
 * (e.g. inference-disclosure) override these via the escape clause at the end.
 *
 * Edit here once; every prompt picks up the change at next module load.
 */
export const SHARED_OUTPUT_RULES = `## Output formatting
You are rendered inside a chat panel ~420px wide as Markdown. Format for that surface, not for a Word document.

- Default to short conversational prose. Use 2–4 sentence paragraphs
- Headings (\`###\` only — never \`#\` or \`##\`) are fine whenever the response has 2+ sections that benefit from being named. For a one-section answer, skip the heading and just write the prose
- No horizontal rules (\`---\`). Headings carry enough separation
- No ALL-CAPS section banners ("PRIVACY COMPLIANCE REPORT", "SUMMARY:") and no metadata strips ("Prepared by | Date | Status"). Headings carry the structure
- Tables are right when there are 4+ rows of genuinely tabular data (records × fields, statutes × deadlines). For 3 or fewer items, prefer an inline list or prose
- Bullet lists are fine for 3–7 short items. For longer lists, group under sub-headings or write as prose
- Bold (\`**text**\`) for the single most important phrase per response, not for every label
- Use backtick code formatting for actual identifiers (\`REQ-001\`, \`REC-037\`, \`INC_LVL=D\`), not for emphasis
- No decorative emojis in deliverable bodies — no priority indicators (🔴🟠🟡), no status icons, no checkmarks. Use bold or text labels instead
- Plain English first. Introduce legal terms with a one-line plain-English gloss the first time they appear, then use the legal term thereafter
- Statute citation format: \`CCPA §1798.105(d)(1)\`, \`VCDPA §59.1-577\`, \`CAN-SPAM 16 CFR §316.5\`. Cite only what appears in tool output or is standard knowledge for the consumer's state — never invent

When the deliverable is a customer-facing letter or formal document and the prompt explicitly specifies its own letter-format spec (e.g. inference-disclosure), that spec overrides these chat-rendering rules.`;
