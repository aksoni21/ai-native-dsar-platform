import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export interface ClarificationDrafterInput {
  requestId: string;
  consumerName: string;
  inboundBody: string;
  missingSignals: string[];
  ambiguityReason: string;
}

/**
 * Drafts the SMTP-ready clarification email Izzy sends back to a consumer
 * after their initial reply was on-topic but ambiguous (parser classification
 * = requests_clarification_needed). The seed-JSON OUT-002 is canned and
 * generic; this drafter reads the actual ambiguity + missing-signals list the
 * parser produced and asks for exactly those specifics in the consumer's
 * own context. Returns SubAgentResult so caller can JSON.parse the summary
 * into { subject, body }.
 */
export async function runClarificationDrafter(
  input: ClarificationDrafterInput,
  onToolStart?: (toolName: string) => void,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('clarification-drafter');
  const userMessage = [
    `Draft the consumer-facing clarification email for request ${input.requestId}.`,
    `Consumer: ${input.consumerName}.`,
    '',
    'CONSUMER\'S REPLY (the ambiguous one we need clarification on):',
    '```',
    input.inboundBody.trim().slice(0, 2000),
    '```',
    '',
    `Parser-flagged ambiguity: ${input.ambiguityReason || '(none provided)'}.`,
    `Specific signals the privacy team needs to act: ${input.missingSignals.length ? input.missingSignals.join(', ') : '(none listed — infer from the reply)'}.`,
    '',
    'Ask for ONLY those missing signals — do not re-explain the DSAR or re-introduce yourself. Reference what the consumer wrote so they know we read it.',
  ].join('\n');
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage,
    onToolStart,
  });
}
