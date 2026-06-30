import type { Vertical, JurisdictionCode, DiscoveryChannel } from '@/types/ai-gov';

export const SITE_NAME = 'Instrata Governance in Layers';
export const SITE_TAG = 'Governance in layers for AI in consequential decisions';

export const VERTICAL_LABELS: Record<Vertical, string> = {
  lending: 'Consumer Lending',
  hr: 'HR & Hiring',
  automotive: 'Automotive OEM',
};

export const VERTICAL_SHORT: Record<Vertical, string> = {
  lending: 'Lending',
  hr: 'HR',
  automotive: 'Auto',
};

export const INTEGRATIONS: Record<Vertical, string[]> = {
  lending: ['nCino', 'Encompass', 'Blend', 'Salesforce Financial Services'],
  hr: ['Workday', 'Greenhouse', 'Lever', 'iCIMS', 'HireVue'],
  automotive: [
    'Pinetop Connected Vehicle Platform',
    'CDK Global DMS',
    'Salesforce Automotive Cloud',
    'Pinetop MAC Core',
    'KBB / Black Book',
  ],
};

export const JURISDICTION_LABELS: Record<JurisdictionCode, string> = {
  CO: 'Colorado SB 26-189',
  CA: 'CA CPPA ADMT',
  NY: 'NYC LL 144 / NY ADMT',
  IL: 'IL AI Hiring + BIPA',
  TX: 'Texas (no state ADMT regime)',
};

export const JURISDICTION_SHORT: Record<JurisdictionCode, string> = {
  CO: 'CO',
  CA: 'CA',
  NY: 'NY',
  IL: 'IL',
  TX: 'TX',
};

export const STATUS_LABEL: Record<string, string> = {
  covered: 'Covered ADMT',
  in_scope: 'In Scope',
  exempt: 'Exempt',
  edge: 'Edge Case',
  green: 'Compliant',
  yellow: 'Gaps Identified',
  red: 'Non-Compliant',
  na: 'Not Applicable',
};

export const DISCOVERY_CHANNEL_LABELS: Record<DiscoveryChannel, string> = {
  saas_integration: 'SaaS integration',
  contract_scan: 'Contract scan',
  bu_intake: 'BU ticket intake',
  warehouse_scan: 'Warehouse scan',
  model_registry: 'Model registry',
};

export const DISCOVERY_CHANNEL_SHORT: Record<DiscoveryChannel, string> = {
  saas_integration: 'SaaS',
  contract_scan: 'Contract',
  bu_intake: 'BU ticket',
  warehouse_scan: 'Warehouse',
  model_registry: 'Registry',
};

export const MIN_SKELETON_MS = 1200;

// Mount point for the AI-Gov demo within the host app. Change here and
// every Link href + fetch URL in this module updates accordingly.
export const ROUTE_PREFIX = '/ai-gov';
export const API_PREFIX = '/api/ai-gov';
