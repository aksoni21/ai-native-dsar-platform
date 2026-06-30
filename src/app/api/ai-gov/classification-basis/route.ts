import { NextResponse } from 'next/server';
import {
  getClassificationForUseCase,
  getInventory,
  getClassificationFallback,
} from '@/lib/ai-gov/data';
import { callModel } from '@/lib/ai-gov/model';
import { MIN_SKELETON_MS, JURISDICTION_LABELS } from '@/lib/ai-gov/constants';
import type { Vertical, ClassificationBasisResponse } from '@/types/ai-gov';

export const runtime = 'nodejs';

interface Body {
  use_case_id?: string;
  vertical?: Vertical;
}

function fallback(useCaseId: string, vertical: Vertical): ClassificationBasisResponse {
  const fb = getClassificationFallback(useCaseId);
  return {
    use_case_id: useCaseId,
    vertical,
    basis:
      fb?.basis ||
      'This system materially influences a consequential decision under the applicable state ADMT regime; deployer obligations apply. Confidence band is moderate absent further data.',
    confidence: fb?.confidence ?? 0.75,
    citations: fb?.citations || ['C.R.S. §6-1-1706(5)(b)'],
    generated_at: new Date().toISOString(),
    fallback: true,
  };
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // ignore
  }
  const vertical = ((body.vertical === 'hr' || body.vertical === 'lending')
    ? body.vertical
    : 'automotive') as Vertical;
  const useCaseId = body.use_case_id || '';

  if (!useCaseId) {
    return NextResponse.json({ error: 'use_case_id required' }, { status: 400 });
  }

  const start = Date.now();

  const useCase = getInventory(vertical).find((u) => u.id === useCaseId);
  const rule = getClassificationForUseCase(vertical, useCaseId);

  if (!useCase || !rule) {
    const ms = Date.now() - start;
    if (ms < MIN_SKELETON_MS) await new Promise((r) => setTimeout(r, MIN_SKELETON_MS - ms));
    return NextResponse.json(fallback(useCaseId, vertical));
  }

  const jurisdictionContext = rule.jurisdictions
    .map((j) => `- ${JURISDICTION_LABELS[j.state]}: ${j.status} (basis: ${j.basis_short})`)
    .join('\n');

  const system = `You are a compliance analyst at a regulated US company. You specialize in state automated decisionmaking (ADMT) statutes — Colorado SB 26-189, the CCPA ADMT regulations, NYC Local Law 144, and the Illinois AI in Hiring Act. You write defensible, plain-English compliance bases. Do not hedge beyond the stated confidence band. Do not give legal advice.`;

  const user = `Write a 2–3 sentence "materially influence" basis for why the following AI use case is Covered ADMT in Colorado under C.R.S. §6-1-1706(5)(b). The basis must reference the specific function the system performs, the type of consequential decision affected, and one citation-style reference. End with one short sentence stating the confidence band.

USE CASE:
- Name: ${useCase.name}
- Vendor: ${useCase.vendor}
- System: ${useCase.system}
- Function: ${useCase.function}
- Input categories: ${useCase.input_categories.join(', ')}
- Risk tier: ${useCase.risk_tier}
- Vertical: ${vertical === 'lending' ? 'consumer lending' : vertical === 'hr' ? 'employment / hiring' : 'automotive OEM / captive finance / connected vehicle'}

JURISDICTIONAL POSTURE (already computed):
${jurisdictionContext}

Output ONLY the basis text — no preamble, no headings.`;

  const text = await callModel({ system, user, max_tokens: 320, temperature: 0.35 });

  const elapsed = Date.now() - start;
  if (elapsed < MIN_SKELETON_MS) {
    await new Promise((r) => setTimeout(r, MIN_SKELETON_MS - elapsed));
  }

  if (!text) {
    return NextResponse.json(fallback(useCaseId, vertical));
  }

  const coRule = rule.jurisdictions.find((j) => j.state === 'CO');
  const resp: ClassificationBasisResponse = {
    use_case_id: useCaseId,
    vertical,
    basis: text,
    confidence: coRule?.confidence ?? 0.85,
    citations: ['C.R.S. §6-1-1706(5)(b)', 'C.R.S. §6-1-1701(3)'],
    generated_at: new Date().toISOString(),
    fallback: false,
  };

  return NextResponse.json(resp);
}
