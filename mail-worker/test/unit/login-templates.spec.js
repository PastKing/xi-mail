import { describe, expect, it } from 'vitest';
import { LOGIN_TEMPLATES, normalizeLoginTemplate } from '../../src/const/login-templates';
import settingService from '../../src/service/setting-service';

describe('retired login templates', () => {
  it.each([
    ['gradient', 'editorial'], ['split', 'editorial'], ['glassmorphism', 'window'],
    ['aurora', 'window'], ['geometric', 'grid'], ['terminal', 'minimal'],
  ])('%s automatically resolves to %s', (old, expected) => {
    expect(normalizeLoginTemplate(old)).toBe(expected);
  });

  it.each(['minimal', 'envelope', 'passport'])('preserves an existing %s selection', value => {
    expect(normalizeLoginTemplate(value)).toBe(value);
  });

  it.each([undefined, null, '', 'unknown', '__proto__', 'constructor', {}, 5])('handles invalid saved values safely: %s', value => {
    const id = normalizeLoginTemplate(value);
    expect(LOGIN_TEMPLATES.some(template => template.id === id)).toBe(true);
  });

  it('normalizes cached settings before exposing them, without a database migration', async () => {
    const cached = { loginTemplate: 'gradient', subWorkerDomains: [], managedDomains: '[]',
      aiModel: 'test', aiCode: 0, queenTokens: {}, sendProviders: {}, emailPrefixFilter: '' };
    const values = new Map();
    const c = { env: { domain: ['example.com'], kv: { get: async () => structuredClone(cached) } },
      get: key => values.get(key), set: (key, value) => values.set(key, value) };
    const result = await settingService.query(c);
    expect(result.loginTemplate).toBe('editorial');
    expect((await settingService.query(c)).loginTemplate).toBe('editorial');
    expect(cached.loginTemplate).toBe('gradient');
  });
});
