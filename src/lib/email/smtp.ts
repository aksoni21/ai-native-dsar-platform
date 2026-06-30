// SMTP send for Communication Coordinator outbound messages.
//
// Port of ai-sdr/providers/smtp_client.py (multipart plain + HTML, Gmail App
// Password). Used by the post-approval pipeline when the operator approves a
// draft in OutboundDraftReview.
//
// Server-side only — never import from a Client Component.

import nodemailer, { type Transporter } from 'nodemailer';

export interface SendEmailAttachment {
  /** Absolute path on disk OR a Buffer; pass one or the other. */
  path?: string;
  content?: Buffer;
  /** Display filename in the email. */
  filename: string;
  /** Optional MIME type (defaults to application/octet-stream). */
  contentType?: string;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  /** Used for threading replies — sets the In-Reply-To and References headers. */
  inReplyTo?: string;
  /** Stable RFC 2822 Message-ID we assign so the IMAP worker can match replies. */
  messageId: string;
  /** Optional file attachments. Each can be a path or a Buffer. */
  attachments?: SendEmailAttachment[];
}

export interface SendEmailResult {
  /** The actual Message-ID Gmail accepted (echoes the one we set). */
  messageId: string;
  /** Recipient the message was actually delivered to (after override). */
  deliveredTo: string;
  /** Recipient declared on the case before any override (always returned for audit). */
  originalRecipient: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
  overrideTo: string | null;
}

function getConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const missing = Object.entries({ SMTP_HOST: host, SMTP_PORT: port, SMTP_USER: user, SMTP_PASS: password })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing SMTP env vars: ${missing.join(', ')}`);
  }
  return {
    host: host!,
    port: Number(port),
    user: user!,
    password: password!,
    fromName: process.env.EMAIL_FROM_NAME || 'Instrata Privacy Operations',
    overrideTo: process.env.EMAIL_OVERRIDE_TO || null,
  };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const cfg = getConfig();
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: false,
    requireTLS: true,
    auth: { user: cfg.user, pass: cfg.password },
  });
  return cachedTransporter;
}

function plaintextToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>\n');
  return (
    '<html><body style="font-family: Arial, sans-serif; font-size: 11pt; color: #222;">' +
    escaped +
    '</body></html>'
  );
}

/**
 * Build an RFC 2822 Message-ID we own. Format:
 *   <instrata-<caseId>-<messageId>-<timestamp>@instrata.example>
 *
 * The IMAP worker uses this to match inbound replies via In-Reply-To.
 */
export function buildMessageId(caseId: string, messageId: string): string {
  const ts = Date.now();
  return `<instrata-${caseId}-${messageId}-${ts}@instrata.example>`;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // Transport router: when Gmail API OAuth creds are present in env, use
  // the HTTPS API (works behind Railway's SMTP egress block). Otherwise
  // fall back to nodemailer SMTP (localhost dev where SMTP isn't blocked).
  if (
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  ) {
    const { sendViaGmailApi } = await import('./gmail-api');
    return sendViaGmailApi(params);
  }

  const cfg = getConfig();
  const deliveredTo = cfg.overrideTo ?? params.to;

  const headers: Record<string, string> = {};
  if (cfg.overrideTo && cfg.overrideTo !== params.to) {
    headers['X-Original-Recipient'] = params.to;
  }
  if (params.inReplyTo) {
    headers['References'] = params.inReplyTo;
  }

  const fromAddr = `${cfg.fromName} <${cfg.user}>`;

  const info = await getTransporter().sendMail({
    from: fromAddr,
    to: params.toName ? `${params.toName} <${deliveredTo}>` : deliveredTo,
    subject: params.subject,
    text: params.body,
    html: plaintextToHtml(params.body),
    messageId: params.messageId,
    inReplyTo: params.inReplyTo,
    headers,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      path: a.path,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  return {
    messageId: info.messageId || params.messageId,
    deliveredTo,
    originalRecipient: params.to,
  };
}
