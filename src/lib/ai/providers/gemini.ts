import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';
import type { AiProviderConfig } from '../config';
import type { AiProvider, AiToolDefinition } from '../types';
import { transcriptFromMessages } from '../utils';

export function geminiToolSchema(tools: AiToolDefinition[]) {
  return [{
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: tool.input_schema,
    })),
  }];
}

export function createGeminiProvider(config: AiProviderConfig): AiProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    name: 'gemini',
    model: config.model,

    async createTurn(request) {
      const response = await client.models.generateContent({
        model: config.model,
        contents: transcriptFromMessages(request.messages),
        config: {
          systemInstruction: request.system,
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
          tools: geminiToolSchema(request.tools) as any,
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
        },
      } as any);

      const assistantContent: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = [];
      const text = (response.text || '').trim();
      if (text) {
        assistantContent.push({ type: 'text', text });
        request.onTextDelta?.(text);
      }

      for (const call of response.functionCalls ?? []) {
        const toolCall = {
          type: 'tool_use' as const,
          id: call.id || `gemini_tool_${assistantContent.length}`,
          name: call.name ?? '',
          input: (call.args ?? {}) as Record<string, unknown>,
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
      const response = await client.models.generateContent({
        model: config.model,
        contents: request.user,
        config: {
          systemInstruction: request.system,
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
        },
      });
      return (response.text || '').trim();
    },
  };
}
