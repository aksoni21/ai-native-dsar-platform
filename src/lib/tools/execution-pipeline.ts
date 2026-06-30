import { generateComplianceReportPptx, loadRequestForReport } from '@/lib/pptx/generate-report';
import { sendEmail } from '@/lib/email/smtp';
import { isValidApprovalPhrase } from '@/lib/tools/approval-policy';
import type {
  PipelineActionKind,
  PipelineArtifact,
  PipelineEmail,
  PipelineManifest,
} from '@/types';

// Hardcoded recipient directory for the demo. In production this would be
// an LDAP / Workday lookup. Keys are lowercased first names.
const PIPELINE_RECIPIENT_DIRECTORY: Record<string, { email: string; full_name: string }> = {
  mary: { email: 'mary@yourcompany.com', full_name: 'Mary Alston' },
  harry: { email: 'harry@yourcompany.com', full_name: 'Harry Velazquez' },
  legal: { email: 'privacy-legal@yourcompany.com', full_name: 'Legal — Privacy' },
};

function resolvePipelineRecipient(name: string): { email: string; to_name: string } {
  const key = name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const hit = PIPELINE_RECIPIENT_DIRECTORY[key];
  if (hit) return { email: hit.email, to_name: hit.full_name };
  const slug = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
  return { email: `${slug || 'recipient'}@yourcompany.com`, to_name: name.trim() };
}

function randHex(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

export async function executePostApprovalPipeline(input: Record<string, unknown>): Promise<{
  summary: string;
  manifest: PipelineManifest | null;
  error?: string;
}> {
  const requestIds = (input.request_ids as string[]) ?? [];
  const actions = (input.actions as Array<{
    kind: PipelineActionKind;
    email_recipient_name?: string;
    email_subject?: string;
  }>) ?? [];
  const authorizationQuote = (input.authorization_quote as string) ?? '';

  if (requestIds.length === 0 || actions.length === 0) {
    return {
      summary: 'Pipeline call rejected: request_ids and actions both required.',
      manifest: null,
      error: 'request_ids and actions are required and must be non-empty',
    };
  }

  const wantsPptx = actions.some((a) => a.kind === 'generate_pptx');
  const wantsSave = actions.some((a) => a.kind === 'save_to_documents');
  const emailAction = actions.find((a) => a.kind === 'send_email');

  if (emailAction && !isValidApprovalPhrase(authorizationQuote)) {
    return {
      summary: 'Pipeline call rejected: authorization_quote is not a recognized approval phrase.',
      manifest: null,
      error:
        'send_email requires authorization_quote to be exactly "I approve this action" (singular) or "I approve these actions" (plural). Got: ' +
        JSON.stringify(authorizationQuote.slice(0, 80)),
    };
  }

  const resolvedRequests: Array<{
    id: string;
    request: NonNullable<Awaited<ReturnType<typeof loadRequestForReport>>>;
  }> = [];
  for (const id of requestIds) {
    const request = await loadRequestForReport(id);
    if (request) resolvedRequests.push({ id, request });
  }

  const artifacts: PipelineArtifact[] = [];
  if (wantsPptx) {
    for (const { id, request } of resolvedRequests) {
      try {
        const generated = await generateComplianceReportPptx(id);
        artifacts.push({
          type: 'pptx',
          request_id: id,
          consumer_name: request.consumer_name,
          filename: generated.filename,
          path: generated.path,
          size_bytes: generated.sizeBytes,
        });
      } catch (err) {
        console.error('[pipeline] pptx generation failed for', id, err);
      }
    }
  }

  let email: PipelineEmail | null = null;
  if (emailAction) {
    const recipientName = emailAction.email_recipient_name ?? 'Mary';
    const { email: to, to_name } = resolvePipelineRecipient(recipientName);
    const subject =
      emailAction.email_subject ??
      (resolvedRequests.length === 1
        ? `Compliance report — ${resolvedRequests[0].id} (${resolvedRequests[0].request.consumer_name})`
        : `Compliance reports — ${resolvedRequests.map((r) => r.id).join(', ')}`);
    const consumerList = resolvedRequests
      .map((r) => `${r.request.consumer_name} (${r.id})`)
      .join(', ');
    const bodyText = `Hi ${to_name.split(' ')[0]},\n\nAttached are the regulator-ready compliance reports for ${consumerList}. Each deck covers the disposition decisions, records reviewed, and statutory citations. Let me know if you'd like any of them re-cut before we deliver to the consumer.\n\nFired via the post-approval execution pipeline on operator's verbatim authorization.\n\nIzzy - Instrata AI governance agent`;

    const rfc822 = `<instrata-pipeline-${randHex(12)}@instrata.example>`;
    try {
      const sendResult = await sendEmail({
        to,
        toName: to_name,
        subject,
        body: bodyText,
        messageId: rfc822,
        attachments: artifacts.map((a) => ({
          filename: a.filename,
          path: a.path,
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })),
      });
      email = {
        to: sendResult.deliveredTo,
        to_name,
        subject,
        body_preview: bodyText.slice(0, 240),
        message_id: sendResult.messageId,
        attachments: artifacts.map((a) => a.filename),
      };
    } catch (err) {
      console.error('[pipeline] smtp send failed:', err);
      email = {
        to,
        to_name,
        subject,
        body_preview: `[SMTP FAILED] ${err instanceof Error ? err.message : String(err)}`,
        message_id: rfc822,
        attachments: artifacts.map((a) => a.filename),
      };
    }
  }

  const actionCount = (wantsPptx ? resolvedRequests.length : 0) +
    (wantsSave && wantsPptx ? 1 : 0) +
    (email ? 1 : 0);

  const manifest: PipelineManifest = {
    pipeline_id: `pipe_${randHex(8)}`,
    completed_at: new Date().toISOString(),
    authorization_quote: authorizationQuote,
    artifacts,
    saved_to_documents: wantsSave && wantsPptx,
    email,
  };

  return {
    summary: `Executed ${actionCount} action${actionCount === 1 ? '' : 's'} across ${resolvedRequests.length} request${resolvedRequests.length === 1 ? '' : 's'}.`,
    manifest,
  };
}
