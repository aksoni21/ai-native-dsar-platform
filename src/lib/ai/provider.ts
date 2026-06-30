import { getAiProviderConfig } from './config';
import type { AiProvider } from './types';
import { createAnthropicProvider } from './providers/anthropic';
import { createOpenAiProvider } from './providers/openai';
import { createGeminiProvider } from './providers/gemini';

export function createAiProvider(): AiProvider {
  const config = getAiProviderConfig();
  if (config.provider === 'anthropic') return createAnthropicProvider(config);
  if (config.provider === 'openai') return createOpenAiProvider(config);
  return createGeminiProvider(config);
}
