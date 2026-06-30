import type { AiContentBlock, AiMessage, AiTextBlock, AiToolResultBlock, AiToolUseBlock } from './types';

export function textFromContent(content: string | AiContentBlock[]): string {
  if (typeof content === 'string') return content;
  return content
    .map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'tool_use') {
        return `[Tool call: ${block.name} ${JSON.stringify(block.input)}]`;
      }
      return `[Tool result for ${block.tool_use_id}: ${block.content}]`;
    })
    .filter(Boolean)
    .join('\n');
}

export function transcriptFromMessages(messages: AiMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${textFromContent(message.content)}`)
    .join('\n\n');
}

export function textBlocksText(blocks: Array<AiTextBlock | AiToolUseBlock>): string {
  return blocks
    .filter((block): block is AiTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export function toolResultBlock(toolUseId: string, result: unknown): AiToolResultBlock {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: JSON.stringify(result),
  };
}

export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
