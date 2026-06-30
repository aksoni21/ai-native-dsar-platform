import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

/**
 * Template for a new agent skill wrapper.
 *
 * 1. Add the prompt to prompts.ts.
 * 2. Add the allowlist + registry entry to registry.ts.
 * 3. Replace `identity-resolver` below with the new registry id.
 * 4. Expose it through the tool runtime only when the parent agent should call it.
 */
export async function runExampleAgentSkill(
  input: string,
  onToolStart?: (toolName: string) => void,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('identity-resolver');
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage: input,
    onToolStart,
  });
}
