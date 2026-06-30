'use client';

import { usePathname } from 'next/navigation';
import { DEMO_STEPS, getStep, nextStep, prevStep } from '@/lib/ai-gov/flow';

export function useFlowStep() {
  const pathname = usePathname() || '';
  // Expect /ai-gov/<slug> when mounted, or /<slug> when standalone.
  const parts = pathname.split('/').filter(Boolean);
  const slug = parts[0] === 'ai-gov' ? parts[1] || '' : parts[0] || '';
  const current = getStep(slug);
  const next = current ? nextStep(slug) : undefined;
  const prev = current ? prevStep(slug) : undefined;
  const stepIndex = current ? DEMO_STEPS.findIndex((s) => s.slug === slug) : -1;
  return { current, next, prev, stepIndex, totalSteps: DEMO_STEPS.length, slug };
}
