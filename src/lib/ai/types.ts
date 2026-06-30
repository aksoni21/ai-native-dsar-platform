export type AiProviderName = 'anthropic' | 'openai' | 'gemini';

export interface AiToolDefinition {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AiTextBlock {
  type: 'text';
  text: string;
}

export interface AiToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export type AiContentBlock = AiTextBlock | AiToolUseBlock | AiToolResultBlock;

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string | AiContentBlock[];
}

export interface AiToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiTurnResult {
  assistantContent: Array<AiTextBlock | AiToolUseBlock>;
  toolCalls: AiToolCall[];
  finalText: string;
}

export interface AiTurnRequest {
  system: string;
  messages: AiMessage[];
  tools: AiToolDefinition[];
  maxTokens: number;
  temperature?: number;
  onTextDelta?: (text: string) => void;
  onToolStart?: (toolCall: AiToolCall) => void;
}

export interface AiTextRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}

export interface AiProvider {
  name: AiProviderName;
  model: string;
  createTurn(request: AiTurnRequest): Promise<AiTurnResult>;
  completeText(request: AiTextRequest): Promise<string>;
}
