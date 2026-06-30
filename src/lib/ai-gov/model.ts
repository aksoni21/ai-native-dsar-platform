import { completeTextWithModel } from '@/lib/ai/tool-loop';

export interface ModelCallOpts {
  system: string;
  user: string;
  max_tokens?: number;
  temperature?: number;
}

export async function callModel({
  system,
  user,
  max_tokens = 400,
  temperature = 0.4,
}: ModelCallOpts): Promise<string | null> {
  try {
    const text = await completeTextWithModel({
      system,
      user,
      maxTokens: max_tokens,
      temperature,
    });
    return text || null;
  } catch {
    return null;
  }
}
