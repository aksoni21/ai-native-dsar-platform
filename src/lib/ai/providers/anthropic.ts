import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderConfig } from '../config';
import type { AiProvider, AiToolCall, AiTurnRequest, AiTurnResult } from '../types';

export function anthropicToolSchema(tools: AiTurnRequest['tools']): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema as Anthropic.Tool.InputSchema,
  }));
}

export function createAnthropicProvider(config: AiProviderConfig): AiProvider {
  const client = new Anthropic({ apiKey: config.apiKey });

  return {
    name: 'anthropic',
    model: config.model,

    async createTurn(request): Promise<AiTurnResult> {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.system,
        tools: anthropicToolSchema(request.tools),
        messages: request.messages as Anthropic.MessageParam[],
        stream: Boolean(request.onTextDelta || request.onToolStart),
      });

      if (!Symbol.asyncIterator || !(Symbol.asyncIterator in Object(response))) {
        const nonStream = response as Anthropic.Message;
        const assistantContent = nonStream.content.map((block) => {
          if (block.type === 'tool_use') {
            return {
              type: 'tool_use' as const,
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            };
          }
          return { type: 'text' as const, text: block.type === 'text' ? block.text : '' };
        });
        const toolCalls = assistantContent.filter((block): block is AiToolCall & { type: 'tool_use' } => block.type === 'tool_use');
        return {
          assistantContent,
          toolCalls,
          finalText: assistantContent
            .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim(),
        };
      }

      const stream = response as AsyncIterable<Anthropic.MessageStreamEvent>;
      const assistantContent: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = [];
      let currentToolUseId = '';
      let currentToolName = '';
      let currentToolInputRaw = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'text') {
            assistantContent.push({ type: 'text', text: '' });
          } else if (event.content_block.type === 'tool_use') {
            currentToolUseId = event.content_block.id;
            currentToolName = event.content_block.name;
            currentToolInputRaw = '';
            const toolCall = {
              type: 'tool_use' as const,
              id: currentToolUseId,
              name: currentToolName,
              input: {},
            };
            assistantContent.push(toolCall);
            request.onToolStart?.(toolCall);
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const lastBlock = assistantContent[assistantContent.length - 1];
            if (lastBlock?.type === 'text') {
              lastBlock.text += event.delta.text;
              request.onTextDelta?.(event.delta.text);
            }
          } else if (event.delta.type === 'input_json_delta') {
            currentToolInputRaw += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          const lastBlock = assistantContent[assistantContent.length - 1];
          if (lastBlock?.type === 'tool_use' && currentToolInputRaw) {
            try {
              lastBlock.input = JSON.parse(currentToolInputRaw);
            } catch {
              lastBlock.input = {};
            }
            currentToolInputRaw = '';
          }
        }
      }

      return {
        assistantContent,
        toolCalls: assistantContent.filter((block): block is AiToolCall & { type: 'tool_use' } => block.type === 'tool_use'),
        finalText: assistantContent
          .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
          .map((block) => block.text)
          .join('\n')
          .trim(),
      };
    },

    async completeText(request) {
      const response = await client.messages.create({
        model: config.model,
        system: request.system,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        messages: [{ role: 'user', content: request.user }],
      });
      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
    },
  };
}
