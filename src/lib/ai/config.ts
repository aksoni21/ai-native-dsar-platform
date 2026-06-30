import type { AiProviderName } from './types';

export interface AiProviderConfig {
  provider: AiProviderName;
  model: string;
  apiKey: string;
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';

function normalizeProvider(raw: string | undefined): AiProviderName {
  const provider = (raw || 'anthropic').trim().toLowerCase();
  if (provider === 'anthropic' || provider === 'openai' || provider === 'gemini') {
    return provider;
  }
  throw new Error(`Unsupported AI_PROVIDER "${raw}". Expected anthropic, openai, or gemini.`);
}

export function getAiProviderConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig {
  const provider = normalizeProvider(env.AI_PROVIDER);
  const model = env.AI_MODEL?.trim() || (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : '');

  if (!model) {
    throw new Error(`AI_MODEL is required when AI_PROVIDER=${provider}.`);
  }

  const keyByProvider: Record<AiProviderName, string | undefined> = {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    gemini: env.GEMINI_API_KEY,
  };
  const apiKey = keyByProvider[provider]?.trim();
  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()} API key is required for AI_PROVIDER=${provider}.`);
  }

  return { provider, model, apiKey };
}

export function getOptionalAiProviderConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig | null {
  try {
    return getAiProviderConfig(env);
  } catch {
    return null;
  }
}
