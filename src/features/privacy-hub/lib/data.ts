import stateLawsRaw from '../data/state_laws.json';
import llmPoliciesRaw from '../data/llm_privacy_policies.json';
import type {
  StateLaw,
  LLMPrivacyData,
  LLMProduct,
  LLMProvider,
} from './types';

export const allStateLaws = stateLawsRaw as unknown as StateLaw[];
export const llmPrivacyData = llmPoliciesRaw as unknown as LLMPrivacyData;

export function getStateLaw(state: string): StateLaw | null {
  const code = state.trim().toUpperCase();
  return allStateLaws.find((l) => l.state.toUpperCase() === code) ?? null;
}

export function getProvider(providerId: string): LLMProvider | null {
  return (
    llmPrivacyData.providers.find((p) => p.id === providerId) ?? null
  );
}

export function getProduct(productId: string): {
  product: LLMProduct;
  provider: LLMProvider;
} | null {
  for (const provider of llmPrivacyData.providers) {
    const product = provider.products.find((p) => p.id === productId);
    if (product) return { product, provider };
  }
  return null;
}
