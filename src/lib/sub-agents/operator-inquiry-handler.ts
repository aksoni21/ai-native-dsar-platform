// Email-mode Izzy: read an operator's email, do the work using read-only
// DSAR tools, return a structured reply (subject + body) that the IMAP
// triage in imap.ts hands off to SMTP for sending.
//
// Lives outside the chat-streaming flow — this is a one-shot non-streaming
// sub-agent invocation that runs server-side when a new email lands in the
// privacy mailbox from an allowlisted sender (see isAllowedEmailSender in
// constants.ts).

import { runSubAgent, type SubAgentResult } from './runner';
import { getImplementedAgentSkill } from './registry';

export interface OperatorInquiryInput {
  sender: string;
  subject: string;
  body: string;
  /**
   * Optional thread context for multi-turn follow-ups. When the operator
   * replies to one of Izzy's prior emails (rather than sending a fresh
   * ask), pass the most-recent prior outbound + inbound so Izzy can
   * resolve references like "the PowerPoint" or "those drafts" without
   * having to re-derive context.
   */
  priorThread?: {
    priorOutboundSubject: string;
    priorOutboundBody: string;
    priorInboundBody?: string;
  };
}

export interface OperatorInquiryReply {
  subject: string;
  body: string;
  toolsUsed: string[];
  iterations: number;
  rawSummary: string;
}

function buildUserMessage(input: OperatorInquiryInput): string {
  const parts: string[] = [
    'An authorized operator has emailed you. Read what they need, run the tools, compose a reply.',
  ];
  if (input.priorThread) {
    parts.push(
      '',
      'PRIOR THREAD CONTEXT — this is a follow-up; the operator is responding to your earlier reply on this case. Use this to resolve references like "the PowerPoint", "those drafts", "the report":',
      '',
      `  your prior reply subject: ${input.priorThread.priorOutboundSubject}`,
      `  your prior reply body:`,
      indent(input.priorThread.priorOutboundBody),
    );
    if (input.priorThread.priorInboundBody) {
      parts.push(
        `  operator's original ask body:`,
        indent(input.priorThread.priorInboundBody),
      );
    }
  }
  parts.push(
    '',
    'NEW EMAIL FROM OPERATOR',
    `  sender: ${input.sender}`,
    `  subject: ${input.subject}`,
    `  body:`,
    indent(input.body),
    '',
    'Now produce the JSON-shaped reply per the system prompt.',
  );
  return parts.join('\n');
}

function indent(s: string): string {
  return s
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

function parseReplyJson(
  summary: string,
  fallbackSubject: string,
): { subject: string; body: string } | null {
  const trimmed = summary.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(trimmed.slice(start, end + 1)) as {
      subject?: string;
      body?: string;
    };
    if (typeof obj.body !== 'string' || obj.body.length === 0) return null;
    const subject =
      typeof obj.subject === 'string' && obj.subject.length > 0
        ? obj.subject
        : `Re: ${fallbackSubject}`;
    return { subject, body: obj.body };
  } catch {
    return null;
  }
}

/**
 * Runs Izzy's email-handler sub-agent over an inbound operator email and
 * returns the structured reply (subject + body). Throws on hard failures
 * (e.g. sub-agent didn't return parseable JSON) so the caller can decide
 * whether to send a fallback bounce.
 */
export async function runOperatorInquiryHandler(
  input: OperatorInquiryInput,
  onToolStart?: (toolName: string) => void,
): Promise<OperatorInquiryReply> {
  const skill = getImplementedAgentSkill('operator-inquiry-handler');
  const result: SubAgentResult = await runSubAgent({
    systemPrompt: skill.systemPrompt,
    allowedToolNames: [...skill.allowedTools],
    userMessage: buildUserMessage(input),
    onToolStart,
  });

  const parsed = parseReplyJson(result.summary, input.subject);
  if (!parsed) {
    throw new Error(
      `operator-inquiry-handler: sub-agent did not return parseable JSON. Raw output: ${result.summary.slice(0, 200)}`,
    );
  }

  return {
    subject: parsed.subject,
    body: parsed.body,
    toolsUsed: result.toolsUsed,
    iterations: result.iterations,
    rawSummary: result.summary,
  };
}
