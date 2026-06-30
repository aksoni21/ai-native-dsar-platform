import OpenAI from 'openai';
import type { AiProviderConfig } from '../config';
import type { AiProvider, AiToolDefinition } from '../types';
import { parseJsonObject, transcriptFromMessages } from '../utils';

export function openAiToolSchema(tools: AiToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
  }));
}

export function createOpenAiProvider(config: AiProviderConfig): AiProvider {
  const client = new OpenAI({ apiKey: config.apiKey });

  return {
    name: 'openai',
    model: config.model,

    async createTurn(request) {
      const response = await client.responses.create({
        model: config.model,
        instructions: request.system,
        input: transcriptFromMessages(request.messages),
        tools: openAiToolSchema(request.tools) as any,
        max_output_tokens: request.maxTokens,
        temperature: request.temperature,
      } as any);

      const output = ((response as any).output ?? []) as any[];
      const assistantContent: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = [];

      const text = (response as any).output_text || output
        .flatMap((item) => item.content ?? [])
        .filter((content) => content.type === 'output_text' || content.type === 'text')
        .map((content) => content.text ?? '')
        .join('\n')
        .trim();

      if (text) {
        assistantContent.push({ type: 'text', text });
        request.onTextDelta?.(text);
      }

      for (const item of output) {
        if (item.type !== 'function_call') continue;
        const toolCall = {
          type: 'tool_use' as const,
          id: item.call_id || item.id || `openai_tool_${assistantContent.length}`,
          name: item.name,
          input: parseJsonObject(item.arguments),
        };
        assistantContent.push(toolCall);
        request.onToolStart?.(toolCall);
      }

      return {
        assistantContent,
        toolCalls: assistantContent.filter((block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } => block.type === 'tool_use'),
        finalText: text,
      };
    },

    async completeText(request) {
      const response = await client.responses.create({
        model: config.model,
        instructions: request.system,
        input: request.user,
        max_output_tokens: request.maxTokens,
        temperature: request.temperature,
      } as any);
      return ((response as any).output_text || '').trim();
    },
  };
}
