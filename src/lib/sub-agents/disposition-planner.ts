import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export async function runDispositionPlanner(
  requestId: string,
  onToolStart?: (toolName: string) => void,
  liveReplyContext?: string,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('disposition-planner');
  const userMessage = liveReplyContext
    ? `Draft the regulator-ready disposition narrative for request ${requestId}.\n\n${liveReplyContext}`
    : `Draft the regulator-ready disposition narrative for request ${requestId}.`;
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage,
    onToolStart,
  });
}
