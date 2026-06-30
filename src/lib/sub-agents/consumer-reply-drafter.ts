import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export interface ConsumerReplyDraft {
  subject: string;
  body: string;
}

/**
 * Drafts a single SMTP-ready consumer-facing reply for a DSAR. Invoked only
 * inside the cascade orchestrator (parse_inbound_reply) — not exposed as an
 * MCP tool.
 *
 * Returns the raw SubAgentResult so callers can inspect tool usage; the
 * orchestrator JSON-parses the summary into a { subject, body } object.
 */
export async function runConsumerReplyDrafter(
  requestId: string,
  onToolStart?: (toolName: string) => void,
  liveReplyContext?: string,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('consumer-reply-drafter');
  const base = `Draft the consumer-facing response email for request ${requestId} after the consumer's clarifying reply added new identity information. The privacy team has just incorporated the maiden-name records into the deletion scope; your email should communicate that outcome plainly and offer a verify-and-pause path.`;
  const userMessage = liveReplyContext ? `${base}\n\n${liveReplyContext}` : base;
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage,
    onToolStart,
  });
}
