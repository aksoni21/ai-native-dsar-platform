// Gmail HTTPS API send transport.
//
// Used in environments where outbound SMTP is blocked (Railway egress
// filter, etc.). Same end result as nodemailer SMTP — the email is
// genuinely sent from the configured GMAIL_USER_EMAIL via Gmail's own outbound
// infrastructure and appears in her Sent folder — but the transport is
// HTTPS to gmail.googleapis.com instead of TCP to smtp.gmail.com:587.
//
// Requires three env vars captured via the /api/oauth/gmail/{start,callback}
// flow:
//   GMAIL_CLIENT_ID
//   GMAIL_CLIENT_SECRET
//   GMAIL_REFRESH_TOKEN
// Plus optionally:
//   GMAIL_USER_EMAIL  (defaults to "me", which resolves to whoever the
//                      refresh token was issued for)
//
// Server-side only.

import nodemailer from 'nodemailer';
import type { SendEmailParams, SendEmailResult } from './smtp';

interface AccessTokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let accessTokenCache: AccessTokenCache | null = null;

function isGmailApiConfigured(): boolean {
  return !!(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

async function fetchAccessToken(): Promise<string> {
  const now = Date.now();
  // Reuse cached token if it has >60s of life left.
  if (accessTokenCache && accessTokenCache.expiresAt > now + 60_000) {
    return accessTokenCache.token;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number; // seconds
    token_type: string;
  };

  accessTokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

/**
 * Build the full RFC 2822 message bytes by piping through nodemailer's
 * stream transport (which composes MIME including multipart attachments)
 * but never opens a socket. Returns the raw bytes ready for base64url
 * encoding + Gmail API submission.
 */
async function buildRawMessage(params: SendEmailParams): Promise<Buffer> {
  const fromName = process.env.EMAIL_FROM_NAME || 'Instrata Privacy Operations';
  const fromAddress = process.env.GMAIL_USER_EMAIL || process.env.SMTP_USER || '';
  const fromAddr = `${fromName} <${fromAddress}>`;

  // EMAIL_OVERRIDE_TO redirect parity with SMTP path.
  const overrideTo = process.env.EMAIL_OVERRIDE_TO || null;
  const deliveredTo = overrideTo ?? params.to;

  const headers: Record<string, string> = {};
  if (overrideTo && overrideTo !== params.to) {
    headers['X-Original-Recipient'] = params.to;
  }
  if (params.inReplyTo) {
    headers['References'] = params.inReplyTo;
  }

  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  });

  const info = (await transport.sendMail({
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
  })) as { message: Buffer };

  return info.message;
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

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send an email via the Gmail HTTPS API. Same signature as the
 * nodemailer SMTP `sendEmail` so callers can swap transports without
 * caring which is in use.
 */
export async function sendViaGmailApi(params: SendEmailParams): Promise<SendEmailResult> {
  const accessToken = await fetchAccessToken();

  const raw = await buildRawMessage(params);
  const encoded = base64UrlEncode(raw);

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    // If access token is stale, drop the cache so the next call refreshes.
    if (res.status === 401) accessTokenCache = null;
    throw new Error(`Gmail API send failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    id: string;
    threadId: string;
    labelIds?: string[];
  };

  // Gmail will sometimes rewrite the RFC 2822 Message-Id we set in the raw
  // MIME (observed in prod: outbound goes out with a fresh
  // <CA...@mail.gmail.com> id, breaking In-Reply-To matching on inbound
  // replies). After send, fetch the message metadata to read whatever
  // Message-Id actually landed on the wire and return THAT — pg stores it,
  // so the IMAP cron's In-Reply-To match path will match.
  const realMessageId = await fetchSentMessageId(accessToken, data.id).catch(
    () => null,
  );

  const overrideTo = process.env.EMAIL_OVERRIDE_TO || null;
  return {
    messageId: realMessageId ?? params.messageId,
    deliveredTo: overrideTo ?? params.to,
    originalRecipient: params.to,
  };
}

/**
 * Fetch the Message-Id header Gmail actually assigned to a sent message.
 * Returns null on any failure — the caller should fall back to the id we
 * tried to set, even though that may not match what Gmail put on the wire.
 */
async function fetchSentMessageId(
  accessToken: string,
  gmailMessageId: string,
): Promise<string | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMessageId}?format=metadata&metadataHeaders=Message-Id`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    payload?: { headers?: Array<{ name: string; value: string }> };
  };
  const header = data.payload?.headers?.find(
    (h) => h.name.toLowerCase() === 'message-id',
  );
  return header?.value ?? null;
}

export { isGmailApiConfigured };
