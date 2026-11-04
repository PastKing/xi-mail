import { createRemoteJWKSet, jwtVerify } from 'jose';
import BizError from '../error/biz-error';

const keys = createRemoteJWKSet(new URL('https://oauth.telegram.org/.well-known/jwks.json'), { timeoutDuration: 10000 });

export async function verifyTelegramIdentity(idToken, clientId, nonce) {
  try {
    if (typeof idToken !== 'string' || idToken.length > 32768) throw new Error('Invalid token');
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: 'https://oauth.telegram.org', audience: clientId, algorithms: ['RS256', 'ES256', 'EdDSA'],
      requiredClaims: ['exp', 'iat', 'sub', 'nonce'], clockTolerance: 30, maxTokenAge: '10 minutes',
    });
    if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub ||
      !/^\d{1,30}$/.test(String(payload.id || '')) || (typeof payload.id === 'number' && !Number.isSafeInteger(payload.id)))
      throw new Error('Invalid identity');
    if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId) throw new Error('Invalid authorized party');
    // Use Telegram's stable numeric user ID, preserving existing Telegram bindings.
    return { id: String(payload.id), username: payload.preferred_username, name: payload.name };
  } catch {
    throw new BizError('Telegram 身份验证失败，请重新授权', 400);
  }
}
