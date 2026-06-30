import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * One-shot OAuth flow start — redirects the operator to Google's consent
 * screen for the `gmail.send` scope. After they grant consent, Google
 * sends them to /api/oauth/gmail/callback with an authorization code.
 *
 * Run this ONCE per environment (localhost, prod) to capture the refresh
 * token, then drop the token into Railway/local env vars as
 * GMAIL_REFRESH_TOKEN. After that, this route is unused at runtime.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GMAIL_CLIENT_ID not set in env' },
      { status: 500 },
    );
  }

  // Build the redirect URI honoring proxy headers so behind Railway/Vercel
  // edge the public origin is used, not the internal one. The redirect_uri
  // must exactly match an entry in Google Cloud Console's Authorized
  // Redirect URIs.
  const redirectUri = computeRedirectUri(req);

  // Debug mode: add ?debug=1 to see the exact redirect_uri without
  // bouncing to Google. Lets you compare byte-for-byte against the
  // value in Cloud Console.
  if (new URL(req.url).searchParams.get('debug') === '1') {
    return NextResponse.json({
      computed_redirect_uri: redirectUri,
      note: 'This exact string must appear in Google Cloud Console under APIs & Services → Credentials → your OAuth client → Authorized redirect URIs. No trailing slash, byte-for-byte match.',
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline', // required to get a refresh_token
    prompt: 'consent', // force re-consent so we always get a fresh refresh_token
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}

function computeRedirectUri(req: NextRequest): string {
  // 1) Explicit env-var override — strictly most reliable. Set this in
  //    prod (OAUTH_REDIRECT_URI=https://your-domain.example/api/oauth/gmail/callback)
  //    so we don't depend on Railway/Vercel header behavior.
  if (process.env.OAUTH_REDIRECT_URI) {
    return process.env.OAUTH_REDIRECT_URI;
  }
  // 2) Forwarded headers — usually correct behind a reverse proxy.
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const host = forwardedHost || req.headers.get('host') || new URL(req.url).host;
  const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/api/oauth/gmail/callback`;
}
