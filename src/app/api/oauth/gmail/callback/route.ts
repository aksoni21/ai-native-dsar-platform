import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * OAuth callback — receives Google's authorization `code`, exchanges it
 * for a refresh token, and renders the token in a plain HTML page so
 * the operator can copy it into env vars.
 *
 * Run once per environment after visiting /api/oauth/gmail/start. The
 * refresh token doesn't expire unless explicitly revoked, so capturing
 * it once is enough.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(
      `<html><body style="font-family:monospace;padding:2rem"><h1>OAuth error</h1><p>${error}</p></body></html>`,
      { status: 400, headers: { 'content-type': 'text/html' } },
    );
  }
  if (!code) {
    return new Response(
      `<html><body style="font-family:monospace;padding:2rem"><h1>Missing code</h1><p>No authorization code in the callback.</p></body></html>`,
      { status: 400, headers: { 'content-type': 'text/html' } },
    );
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response(
      `<html><body style="font-family:monospace;padding:2rem"><h1>Server misconfigured</h1><p>GMAIL_CLIENT_ID and/or GMAIL_CLIENT_SECRET are not set in env.</p></body></html>`,
      { status: 500, headers: { 'content-type': 'text/html' } },
    );
  }

  // Match the redirect_uri derivation in the /start route — must be
  // byte-identical or Google rejects the token exchange. Env-var override
  // wins; otherwise fall through to forwarded headers.
  let redirectUri: string;
  if (process.env.OAUTH_REDIRECT_URI) {
    redirectUri = process.env.OAUTH_REDIRECT_URI;
  } else {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const host = forwardedHost || req.headers.get('host') || url.host;
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
    redirectUri = `${proto}://${host}/api/oauth/gmail/callback`;
  }

  // Exchange the authorization code for a refresh token + access token.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    return new Response(
      `<html><body style="font-family:monospace;padding:2rem"><h1>Token exchange failed (${tokenRes.status})</h1><pre>${escapeHtml(errBody)}</pre></body></html>`,
      { status: 500, headers: { 'content-type': 'text/html' } },
    );
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };

  if (!tokenData.refresh_token) {
    return new Response(
      `<html><body style="font-family:monospace;padding:2rem"><h1>No refresh token returned</h1><p>Google didn't issue a refresh_token. This usually means the same user has authorized this client before and is being given a fresh access_token without a new refresh_token. To force a new one, revoke the app's access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and try again.</p></body></html>`,
      { status: 400, headers: { 'content-type': 'text/html' } },
    );
  }

  return new Response(
    `<html><body style="font-family:monospace;padding:2rem;line-height:1.6;background:#0F1626;color:#F4F4F5">
      <h1 style="color:#34D399">Got the refresh token</h1>
      <p>Copy this into your env vars as <code>GMAIL_REFRESH_TOKEN</code>:</p>
      <pre style="background:#1F2937;padding:1rem;border-radius:8px;overflow-x:auto;user-select:all">${escapeHtml(tokenData.refresh_token)}</pre>
      <p style="opacity:0.7">Scope: <code>${escapeHtml(tokenData.scope)}</code></p>
      <p style="opacity:0.7">Add these to Railway env (or .env.local for dev):</p>
      <pre style="background:#1F2937;padding:1rem;border-radius:8px;user-select:all">GMAIL_CLIENT_ID=${escapeHtml(clientId)}
GMAIL_CLIENT_SECRET=&lt;keep secret&gt;
GMAIL_REFRESH_TOKEN=${escapeHtml(tokenData.refresh_token)}
GMAIL_USER_EMAIL=izzy@your-domain.example</pre>
      <p style="margin-top:2rem;color:#9CA3AF;font-size:0.9em">Refresh tokens don't expire unless explicitly revoked. Capture this once, paste into env, redeploy. Then close this tab — this page never runs again at runtime.</p>
    </body></html>`,
    { headers: { 'content-type': 'text/html' } },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
