const TURNSTILE = 'https://challenges.cloudflare.com';
const APP_POLICY = [
  "default-src 'self'",
  `script-src 'self' ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' https: http: data: blob:",
  "font-src 'self' https: data:",
  "connect-src 'self' https: http:",
  `frame-src 'self' about: blob: ${TURNSTILE}`,
  "worker-src 'self' blob:",
  "media-src 'self' https: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');
const API_POLICY = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

export function secureResponse(response, url, appDocument = false, apiResponse = false) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!headers.has('Content-Security-Policy') && (appDocument || apiResponse)) {
    headers.set('Content-Security-Policy', appDocument ? APP_POLICY : API_POLICY);
  }
  if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

export function allowedApiOrigin(origin, requestOrigin, configuredOrigins) {
  if (origin === requestOrigin) return origin;
  const origins = typeof configuredOrigins === 'string' ? configuredOrigins.split(',') : [];
  if (/^(https?|chrome-extension|moz-extension):\/\//.test(origin) && origins.some(value => value.trim() === origin)) {
    return origin;
  }
}
