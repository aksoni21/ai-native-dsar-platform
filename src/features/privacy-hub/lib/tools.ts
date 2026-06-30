// Privacy Hub agent tools. All read-only, all backed by the two static
// JSON files in ../data/. No DSAR pipeline access, no Postgres, no writes.
//
// Adding a new tool:
//   1. Define schema in PRIVACY_HUB_TOOL_DEFINITIONS
//   2. Add a case in executePrivacyHubTool
//   3. Mention it in lib/system-prompt.ts so the model knows when to reach for it
//
// Adding a write tool: don't. Privacy Hub is reference + Q&A only.

import {
  allStateLaws,
  llmPrivacyData,
  getStateLaw,
  getProduct,
} from './data';

export const PRIVACY_HUB_TOOL_DEFINITIONS = [
  {
    name: 'list_state_laws',
    description:
      'List all US state privacy laws tracked in the hub, with status (enforced / effective / pending_enforcement), DSAR deadline, and law abbreviation. Use for overview questions or to enumerate which states have what.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description:
            'Optional filter — one of: enforced, effective, pending_enforcement. Omit to return all.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_state_law',
    description:
      'Get the full statutory framework for a single US state — effective and enforcement dates, DSAR deadline + extension, consumer rights granted, enforcement body, business thresholds, sensitive-data definition, opt-out provisions, GPC requirement, cure period, and source URL. Use whenever the user asks about a specific state.',
    input_schema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          description: '2-letter state code, e.g. CA, VA, CT.',
        },
      },
      required: ['state'],
    },
  },
  {
    name: 'compare_state_laws',
    description:
      'Compare 2–5 state laws side-by-side on the dimensions that matter most for compliance planning: deadline, extension, consumer rights, opt-out provisions, GPC, private right of action, enforcement body, cure period. Use when the user asks "how does CA compare to VA" or wants a multi-state matrix.',
    input_schema: {
      type: 'object' as const,
      properties: {
        states: {
          type: 'array',
          items: { type: 'string' },
          description: '2-letter state codes to compare, e.g. ["CA", "VA", "CT"].',
        },
      },
      required: ['states'],
    },
  },
  {
    name: 'list_ai_providers',
    description:
      'List all AI providers in the hub with their product counts. Use for "what providers do you cover" or as a starting point before drilling into a specific product.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_provider_policy',
    description:
      'Get the full privacy policy snapshot for a specific AI product — training behavior on inputs/outputs, retention windows, zero-retention availability, abuse monitoring, human review possibility, DPA availability, data residency, sub-processor disclosure, deletion-on-request. Use whenever the user asks about a named product (e.g. "ChatGPT Enterprise", "Claude API", "Gemini Workspace").',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: {
          type: 'string',
          description:
            'Product ID, e.g. "anthropic-api", "openai-chatgpt-enterprise", "google-gemini-workspace". Use list_ai_providers if you need to discover the right id.',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'compare_providers',
    description:
      'Compare 2–5 AI products side-by-side on training, retention, abuse monitoring, human review, DPA, data residency, and deletion. Use when the user asks "Claude vs OpenAI" or wants a vendor matrix for procurement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_ids: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Product IDs to compare, e.g. ["anthropic-api", "openai-chatgpt-enterprise"].',
        },
      },
      required: ['product_ids'],
    },
  },
];

export type PrivacyHubToolName =
  typeof PRIVACY_HUB_TOOL_DEFINITIONS[number]['name'];

export async function executePrivacyHubTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'list_state_laws': {
      const status = input.status as string | undefined;
      const filtered = status
        ? allStateLaws.filter((l) => l.status === status)
        : allStateLaws;
      return {
        count: filtered.length,
        laws: filtered.map((l) => ({
          state: l.state,
          state_full: l.state_full,
          law_abbreviation: l.law_abbreviation,
          status: l.status,
          dsar_deadline_days: l.dsar_deadline_days,
          extension_days: l.extension_days,
          private_right_of_action: l.private_right_of_action,
          gpc_required: l.gpc_required,
        })),
      };
    }

    case 'get_state_law': {
      const state = input.state as string;
      const law = getStateLaw(state);
      if (!law) return { error: `No law found for state code "${state}"` };
      return law;
    }

    case 'compare_state_laws': {
      const states = (input.states as string[]) || [];
      if (states.length < 2) {
        return { error: 'Provide at least 2 state codes to compare.' };
      }
      const rows = states.map((s) => {
        const law = getStateLaw(s);
        if (!law) return { state: s.toUpperCase(), error: 'not found' };
        return {
          state: law.state,
          state_full: law.state_full,
          law_abbreviation: law.law_abbreviation,
          status: law.status,
          effective_date: law.effective_date,
          enforcement_date: law.enforcement_date,
          dsar_deadline_days: law.dsar_deadline_days,
          extension_days: law.extension_days,
          cure_period_days: law.cure_period_days,
          consumer_rights: law.consumer_rights,
          private_right_of_action: law.private_right_of_action,
          opt_out_sale: law.opt_out_sale,
          opt_out_targeted_ads: law.opt_out_targeted_ads,
          opt_out_profiling: law.opt_out_profiling,
          gpc_required: law.gpc_required,
          enforcement_body: law.enforcement_body,
        };
      });
      return { compared: rows };
    }

    case 'list_ai_providers': {
      return {
        last_updated: llmPrivacyData.last_updated,
        provider_count: llmPrivacyData.providers.length,
        providers: llmPrivacyData.providers.map((p) => ({
          id: p.id,
          name: p.name,
          website: p.website,
          product_count: p.products.length,
          products: p.products.map((pr) => ({
            id: pr.id,
            name: pr.name,
            tier: pr.tier,
          })),
        })),
      };
    }

    case 'get_provider_policy': {
      const productId = input.product_id as string;
      const found = getProduct(productId);
      if (!found) {
        return { error: `Product "${productId}" not found.` };
      }
      const { product, provider } = found;
      return {
        provider: { id: provider.id, name: provider.name, website: provider.website },
        product: {
          id: product.id,
          name: product.name,
          tier: product.tier,
          governing_terms: product.governing_terms,
          governing_terms_url: product.governing_terms_url,
          last_verified: product.last_verified,
        },
        policy: product.policy,
        source_urls: product.source_urls,
      };
    }

    case 'compare_providers': {
      const ids = (input.product_ids as string[]) || [];
      if (ids.length < 2) {
        return { error: 'Provide at least 2 product_ids to compare.' };
      }
      const rows = ids.map((id) => {
        const found = getProduct(id);
        if (!found) return { product_id: id, error: 'not found' };
        const { product, provider } = found;
        return {
          product_id: product.id,
          provider_name: provider.name,
          product_name: product.name,
          tier: product.tier,
          trains_on_input: product.policy.trains_on_input,
          trains_on_output: product.policy.trains_on_output,
          input_retention_days: product.policy.input_retention_days,
          output_retention_days: product.policy.output_retention_days,
          zero_retention_available: product.policy.zero_retention_available,
          abuse_monitoring: product.policy.abuse_monitoring,
          human_review_possible: product.policy.human_review_possible,
          dpa_available: product.policy.dpa_available,
          data_location: product.policy.data_location,
          data_region_choice: product.policy.data_region_choice,
          sub_processors_disclosed: product.policy.sub_processors_disclosed,
          deletion_on_request: product.policy.deletion_on_request,
        };
      });
      return { compared: rows };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
