import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export async function runReportGenerator(
  requestId: string,
  onToolStart?: (toolName: string) => void,
  liveReplyContext?: string,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('report-generator');
  const userMessage = liveReplyContext
    ? `Produce the final regulator-ready compliance report for request ${requestId}.\n\n${liveReplyContext}`
    : `Produce the final regulator-ready compliance report for request ${requestId}.`;
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage,
    onToolStart,
  });
}
