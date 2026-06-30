import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export async function runInferenceDisclosure(
  requestId: string,
  onToolStart?: (toolName: string) => void,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('inference-disclosure');
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage: `Draft the customer-facing inference-disclosure section for request ${requestId}. Decode every coded field across every matched record and compose it as prose the privacy team can paste into the response letter.`,
    onToolStart,
  });
}
