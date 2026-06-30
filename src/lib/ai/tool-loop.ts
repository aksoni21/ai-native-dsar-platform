import { createAiProvider } from './provider';
import type { AiMessage, AiToolDefinition } from './types';
import { toolResultBlock } from './utils';

export interface StreamToolLoopArgs {
  system: string;
  messages: AiMessage[];
  tools: AiToolDefinition[];
  maxTokens?: number;
  executeTool: (name: string, input: Record<string, unknown>, toolCallId: string) => Promise<unknown>;
  sendEvent: (event: object) => void;
  modelResultForTool?: (result: unknown) => unknown;
}

export async function streamToolLoop({
  system,
  messages,
  tools,
  maxTokens = 4096,
  executeTool,
  sendEvent,
  modelResultForTool = (result) => result,
}: StreamToolLoopArgs): Promise<void> {
  const provider = createAiProvider();
  const currentMessages: AiMessage[] = [...messages];

  while (true) {
    const turn = await provider.createTurn({
      system,
      messages: currentMessages,
      tools,
      maxTokens,
      onTextDelta: (text) => sendEvent({ type: 'text_delta', text }),
      onToolStart: (toolCall) => {
        sendEvent({
          type: 'tool_start',
          tool_use_id: toolCall.id,
          tool_name: toolCall.name,
        });
      },
    });

    currentMessages.push({ role: 'assistant', content: turn.assistantContent });

    if (turn.toolCalls.length === 0) break;

    const toolResults = [];
    for (const toolCall of turn.toolCalls) {
      let result: unknown;
      try {
        result = await executeTool(toolCall.name, toolCall.input, toolCall.id);
      } catch (err) {
        result = { error: String(err) };
      }

      sendEvent({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        tool_name: toolCall.name,
        result,
      });

      toolResults.push(toolResultBlock(toolCall.id, modelResultForTool(result)));
    }

    currentMessages.push({ role: 'user', content: toolResults });
  }
}

export interface RunToolLoopArgs {
  system: string;
  userMessage: string;
  tools: AiToolDefinition[];
  maxTokens?: number;
  maxIterations?: number;
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  onToolStart?: (toolName: string) => void;
}

export interface RunToolLoopResult {
  summary: string;
  toolsUsed: string[];
  iterations: number;
}

export async function runToolLoop({
  system,
  userMessage,
  tools,
  maxTokens = 4096,
  maxIterations = 8,
  executeTool,
  onToolStart,
}: RunToolLoopArgs): Promise<RunToolLoopResult> {
  const provider = createAiProvider();
  const messages: AiMessage[] = [{ role: 'user', content: userMessage }];
  const toolsUsed: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const turn = await provider.createTurn({
      system,
      messages,
      tools,
      maxTokens,
    });

    messages.push({ role: 'assistant', content: turn.assistantContent });

    if (turn.toolCalls.length === 0) {
      return {
        summary: turn.finalText || '(sub-agent returned no text)',
        toolsUsed,
        iterations: i + 1,
      };
    }

    const toolResults = [];
    for (const toolCall of turn.toolCalls) {
      toolsUsed.push(toolCall.name);
      onToolStart?.(toolCall.name);
      let result: unknown;
      try {
        result = await executeTool(toolCall.name, toolCall.input);
      } catch (err) {
        result = { error: String(err) };
      }
      toolResults.push(toolResultBlock(toolCall.id, result));
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    summary: '(sub-agent hit max iterations without producing a final answer)',
    toolsUsed,
    iterations: maxIterations,
  };
}

export async function completeTextWithModel(args: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const provider = createAiProvider();
  return provider.completeText({
    system: args.system,
    user: args.user,
    maxTokens: args.maxTokens ?? 400,
    temperature: args.temperature,
  });
}
