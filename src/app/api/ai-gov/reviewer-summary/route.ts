import { NextResponse } from 'next/server';
import {
  getApplicantById,
  getAuditTrail,
  getReviewerFallback,
} from '@/lib/ai-gov/data';
import { callModel } from '@/lib/ai-gov/model';
import { MIN_SKELETON_MS } from '@/lib/ai-gov/constants';
import type { Vertical, ReviewerSummaryResponse } from '@/types/ai-gov';

export const runtime = 'nodejs';

interface Body {
  applicant_id?: string;
  vertical?: Vertical;
}

function fallback(applicantId: string, vertical: Vertical): ReviewerSummaryResponse {
  const fb = getReviewerFallback(applicantId);
  return {
    applicant_id: applicantId,
    vertical,
    summary:
      fb?.summary ||
      'Briefing unavailable from cache. The reviewer should pull the case file, walk the inputs used, and look for a single data point most likely to flip the outcome on correction.',
    top_factors: fb?.top_factors || [],
    reviewer_prompts:
      fb?.reviewer_prompts || ['Open the case file.', 'Verify the top factor.', 'Document any override.'],
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
  const applicantId = body.applicant_id || '';

  if (!applicantId) {
    return NextResponse.json({ error: 'applicant_id required' }, { status: 400 });
  }

  const start = Date.now();
  const applicant = getApplicantById(vertical, applicantId);
  const audit = getAuditTrail(vertical);

  if (!applicant) {
    const ms = Date.now() - start;
    if (ms < MIN_SKELETON_MS) await new Promise((r) => setTimeout(r, MIN_SKELETON_MS - ms));
    return NextResponse.json(fallback(applicantId, vertical));
  }

  const auditSnippet = audit.entries
    .filter((e) => e.action === 'model_scored' || e.action === 'decision_recorded')
    .map((e) => `${e.actor_name}: ${e.detail}`)
    .join('\n');

  const fb = getReviewerFallback(applicantId);
  const seededFactors = fb?.top_factors || [];

  const system = `You are summarizing a model-driven adverse decision for a human reconsideration reviewer. Applicable regimes by vertical: Colorado SB 26-189 §1705 (lending), NYC Local Law 144 §20-871 (employment), or California CCPA ADMT regs + connected-vehicle privacy (automotive). Write in plain English. Be specific — and where cross-system data (e.g., telematics from a prior vehicle informing a finance decision) was used, name it explicitly and flag the secondary-use opt-in question. Do NOT recommend an outcome. Keep the response under 140 words.`;

  const user = `Briefing context:

APPLICANT:
- ID: ${applicant.id}
- ${vertical === 'hr' ? 'Role' : 'Product / Vehicle'}: ${applicant.product_or_role}
- State: ${applicant.state}
- Decision: ${applicant.decision}
- Model: ${applicant.vendor} (${applicant.model_id})
- Confidence: ${applicant.confidence}
- Influential factors: ${applicant.factors.join(', ')}${
    applicant.ecoa_codes ? `\n- ECOA codes returned: ${applicant.ecoa_codes.join(', ')}` : ''
  }

AUDIT SNIPPET:
${auditSnippet}

TOP FACTORS (seeded — use to ground your weights):
${seededFactors.map((f) => `- ${f.name} (weight ${f.weight}): ${f.value}`).join('\n')}

Write exactly:
1) One short paragraph (3–4 sentences) summarizing what the model decided, the top inputs it relied on, and the SINGLE most-worth-rechecking data point. No outcome recommendation.

Output ONLY the paragraph — no preamble, no bullets, no headings.`;

  const text = await callModel({ system, user, max_tokens: 280, temperature: 0.45 });

  const elapsed = Date.now() - start;
  if (elapsed < MIN_SKELETON_MS) {
    await new Promise((r) => setTimeout(r, MIN_SKELETON_MS - elapsed));
  }

  if (!text) {
    return NextResponse.json(fallback(applicantId, vertical));
  }

  const resp: ReviewerSummaryResponse = {
    applicant_id: applicantId,
    vertical,
    summary: text,
    top_factors: seededFactors,
    reviewer_prompts: fb?.reviewer_prompts || [
      'Pull the case file from the supporting-docs vault.',
      'Verify the most-worth-rechecking data point.',
      'Document the outcome and rationale in the audit trail.',
    ],
    generated_at: new Date().toISOString(),
    fallback: false,
  };

  return NextResponse.json(resp);
}
