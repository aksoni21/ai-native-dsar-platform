import type { DemoStep } from '@/types/ai-gov';

export const DEMO_STEPS: DemoStep[] = [
  {
    slug: 'inbox',
    label: 'AG Inbox',
    short: 'The notice hits the GC',
    module: 'regulatory-watchtower',
  },
  {
    slug: 'dashboard',
    label: 'Dashboard',
    short: 'Cohort pre-loaded; one-click packet',
    module: 'audit-trail',
  },
  {
    slug: 'inventory',
    label: 'AI Inventory',
    short: 'Auto-discovery: what AI you actually have',
    module: 'inventory',
  },
  {
    slug: 'classification',
    label: 'Classification',
    short: 'Covered ADMT — per jurisdiction',
    module: 'control-mapping',
  },
  {
    slug: 'vendor-vault',
    label: 'Vendor Vault',
    short: '§1702 packets + diff alerts',
    module: 'vendor-vault',
  },
  {
    slug: 'pre-decision',
    label: 'Pre-Decision Notice',
    short: 'Auto-generated on the application page',
    module: 'disclosures',
  },
  {
    slug: 'adverse-outcome',
    label: 'Adverse Outcome',
    short: 'ECOA-equivalent — augmented, not duplicated',
    module: 'federal-bridges',
  },
  {
    slug: 'human-review',
    label: 'Human Review',
    short: 'Reviewer pane + AI-generated case summary',
    module: 'human-review',
  },
  {
    slug: 'audit-trail',
    label: 'Audit Trail',
    short: 'Append-only; regulator-exportable',
    module: 'audit-trail',
  },
  {
    slug: 'heat-map',
    label: 'Multi-State Heat Map',
    short: 'Green / yellow / red + remediation roadmap',
    module: 'control-mapping',
  },
];

export function getStepIndex(slug: string): number {
  return DEMO_STEPS.findIndex((s) => s.slug === slug);
}

export function getStep(slug: string): DemoStep | undefined {
  return DEMO_STEPS.find((s) => s.slug === slug);
}

export function nextStep(slug: string): DemoStep | undefined {
  const idx = getStepIndex(slug);
  if (idx < 0 || idx >= DEMO_STEPS.length - 1) return undefined;
  return DEMO_STEPS[idx + 1];
}

export function prevStep(slug: string): DemoStep | undefined {
  const idx = getStepIndex(slug);
  if (idx <= 0) return undefined;
  return DEMO_STEPS[idx - 1];
}
