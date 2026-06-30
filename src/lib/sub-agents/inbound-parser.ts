import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export interface InboundParserInput {
  messageId: string;
  caseId: string;
  application: string;
  applicationContext: Record<string, unknown>;
  outbound: { subject: string; body: string } | null;
  inbound: {
    sender: string;
    received_at: string | null;
    subject: string;
    body: string;
  };
}

function buildUserMessage(input: InboundParserInput): string {
  const ctx = JSON.stringify(input.applicationContext);
  const out = input.outbound
    ? `OUTBOUND THAT PROMPTED THIS REPLY\n  subject: ${input.outbound.subject}\n  body:\n${indent(input.outbound.body)}`
    : 'OUTBOUND THAT PROMPTED THIS REPLY\n  (no outbound on file — the inbound arrived without a prior thread)';
  return [
    'Parse the following inbound reply and return a single JSON object per the system prompt.',
    '',
    'CASE CONTEXT',
    `  case_id: ${input.caseId}`,
    `  application: ${input.application}`,
    `  application_context: ${ctx}`,
    '',
    out,
    '',
    'INBOUND REPLY TO PARSE',
    `  message_id: ${input.messageId}`,
    `  sender: ${input.inbound.sender}`,
    `  received_at: ${input.inbound.received_at ?? '(unknown)'}`,
    `  subject: ${input.inbound.subject}`,
    `  body:`,
    indent(input.inbound.body),
  ].join('\n');
}

function indent(s: string): string {
  return s
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

export async function runInboundParser(
  input: InboundParserInput,
  onToolStart?: (toolName: string) => void,
): Promise<SubAgentResult> {
  const skill = getImplementedAgentSkill('inbound-parser');
  return runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage: buildUserMessage(input),
    onToolStart,
  });
}
