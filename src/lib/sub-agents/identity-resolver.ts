import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export async function runIdentityResolver(
  hint: string,
  onToolStart?: (toolName: string) => void,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('identity-resolver');
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage: `Resolve the cross-system identity for this hint:\n\n${hint}`,
    onToolStart,
  });
}
