import { createRemoteJWKSet, jwtVerify } from 'jose';
import BizError from '../error/biz-error';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 10000 });
export async function verifyGoogleIdentity(idToken, clientId, nonce) {
  try {
    if (typeof idToken !== 'string' || idToken.length > 32768) throw new Error('Invalid token');
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: clientId, algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'nonce'], clockTolerance: 30, maxTokenAge: '10 minutes',
    });
    if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(payload.sub)) throw new Error('Invalid identity');
    if ((Array.isArray(payload.aud) && payload.aud.length > 1 || payload.azp !== undefined) && payload.azp !== clientId) throw new Error('Invalid presenter');
    return { id: payload.sub, name: typeof payload.name === 'string' ? payload.name : 'Google' };
  } catch {
    throw new BizError('Google 身份验证失败，请重新授权', 400);
  }
}
