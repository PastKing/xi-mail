import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import loginService from '../../src/service/login-service';
import settingService from '../../src/service/setting-service';
import accountService from '../../src/service/account-service';
import userService from '../../src/service/user-service';
import roleService from '../../src/service/role-service';
import regKeyService from '../../src/service/reg-key-service';
import verifyRecordService from '../../src/service/verify-record-service';
import rateLimit from '../../src/service/security-rate-limit-service';
import cryptoUtils from '../../src/utils/crypto-utils';
import * as registration from '../../src/service/registration-service';

let settings, c, lookup, invitation, create, fetchMock;
const input = (extra = {}) => ({ email: 'candidate@allowed.example', password: 'Local-test-pass1', code: 'test-invitation', ...extra });
beforeEach(() => {
  settings = { register: 0, regKey: 0, registerVerify: 0, regVerifyCount: 1, minEmailPrefix: 3,
    emailPrefixFilter: [], emailKeywordBlacklist: [], domainList: ['@allowed.example'], secretKey: 'test-private-secret' };
  c = { env: { admin: 'admin@allowed.example' }, req: { header: () => '192.0.2.1' } };
  vi.spyOn(settingService, 'query').mockImplementation(async () => settings);
  vi.spyOn(rateLimit, 'consume').mockResolvedValue(undefined);
  lookup = vi.spyOn(accountService, 'selectByEmailIncludeDel').mockResolvedValue(undefined);
  invitation = vi.spyOn(loginService, 'handleOpenRegKey').mockResolvedValue({ type: 2, regKeyId: 1 });
  vi.spyOn(roleService, 'selectById').mockResolvedValue({ availDomain: 'allowed.example' });
  vi.spyOn(cryptoUtils, 'hashPassword').mockResolvedValue({ salt: 'local-salt', hash: 'local-hash' });
  create = vi.spyOn(registration, 'createRegistration').mockResolvedValue(10);
  vi.spyOn(accountService, 'insert').mockResolvedValue(undefined);
  vi.spyOn(userService, 'updateUserInfo').mockResolvedValue(undefined);
  vi.spyOn(regKeyService, 'reduceCount').mockResolvedValue(undefined);
  vi.spyOn(verifyRecordService, 'isOpenRegVerify').mockResolvedValue(true);
  vi.spyOn(verifyRecordService, 'increaseRegCount').mockResolvedValue({ count: 1 });
  fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ success: true }));
});
afterEach(() => vi.restoreAllMocks());

describe('Registration Turnstile guard', () => {
  it('registers an external login address without creating a hosted mailbox, preserving the invitation role', async () => {
    settings.emailPrefixFilter = ['x']; settings.emailKeywordBlacklist = ['x'];
    await expect(loginService.register(c, input({email:' X@External.Example ',token:'test-token'}))).resolves.toEqual({regVerifyOpen:true});
    expect(create.mock.calls[0][1]).toMatchObject({email:'x@external.example',type:2,regKeyId:1,createMailbox:false});
    expect(create.mock.calls[0][2]).toMatchObject({code:'test-invitation'});
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('still requires CAPTCHA before registering external identities', async () => {
    await expect(loginService.register(c,input({email:'new@external.example'}))).rejects.toMatchObject({code:400});
    expect(create).not.toHaveBeenCalled(); expect(invitation).not.toHaveBeenCalled();
  });
  it('does not bypass a required invitation for external identities', async () => {
    invitation.mockRestore();
    await expect(loginService.register(c,input({email:'new@external.example',code:'',token:'test-token'}))).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it('continues to create primary mailboxes and enforce suffix permissions for managed addresses', async () => {
    await loginService.register(c,input({token:'test-token'}));
    expect(create.mock.calls[0][1].createMailbox).toBe(true);
    roleService.selectById.mockResolvedValue({availDomain:'other.example'});
    await expect(loginService.register(c,input({token:'test-token'}))).rejects.toMatchObject({code:403});
  });
  it('keeps managed prefix rules and rejects malformed external addresses', async () => {
    await expect(loginService.register(c,input({email:'x@allowed.example',token:'test-token'}))).rejects.toThrow();
    await expect(loginService.register(c,input({email:'name@@external.example',token:'test-token'}))).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it.each([undefined, '', ' ', {}, [], 'x'.repeat(2049)])('rejects invalid token before invitation/address queries (%j)', async token => {
    await expect(loginService.register(c, input({ token }))).rejects.toMatchObject({ code: 400 });
    expect(invitation).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not exempt an anonymous caller claiming the administrator email', async () => {
    settings.emailPrefixFilter = ['admin'];
    await expect(loginService.register(c, input({ email: c.env.admin }))).rejects.toMatchObject({ code: 400 });
    expect(invitation).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled();
  });
  it.each([false, 'true', 1, undefined])('requires a genuine successful Siteverify response (%j)', async success => {
    fetchMock.mockResolvedValue(Response.json({ success }));
    await expect(loginService.register(c, input({ token: 'forged-token' }))).rejects.toMatchObject({ code: 400 });
    expect(invitation).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });
  it.each(['network', 'http', 'json', 'configuration'])('fails closed when verification fails: %s', async mode => {
    if (mode === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    if (mode === 'http') fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    if (mode === 'json') fetchMock.mockResolvedValue(new Response('not-json'));
    if (mode === 'configuration') settings.secretKey = '';
    await expect(loginService.register(c, input({ token: 'test-token' }))).rejects.toMatchObject({ code: 503 });
    expect(invitation).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });
  it('verifies the supplied token on the server before consuming an invitation or creating accounts', async () => {
    await expect(loginService.register(c, input({ token: 'test-token' }))).resolves.toEqual({ regVerifyOpen: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(options.body.get('response')).toBe('test-token');
    expect(options.body.get('secret')).toBe('test-private-secret');
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(invitation.mock.invocationCallOrder[0]);
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(lookup.mock.invocationCallOrder[0]);
    expect(create).toHaveBeenCalledOnce(); expect(regKeyService.reduceCount).not.toHaveBeenCalled();
    expect(create.mock.calls[0][1].regKeyId).toBe(1); expect(create.mock.calls[0][2].code).toBe('test-invitation');
  });
  it('requires verification in threshold mode after the server-side threshold is reached', async () => {
    settings.registerVerify = 2;
    await expect(loginService.register(c, input())).rejects.toMatchObject({ code: 400 });
    expect(lookup).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });
  it('preserves the explicitly configured free allowance before the threshold', async () => {
    settings.registerVerify = 2;
    verifyRecordService.isOpenRegVerify.mockResolvedValue(false);
    await expect(loginService.register(c, input())).resolves.toEqual({ regVerifyOpen: true });
    expect(fetchMock).not.toHaveBeenCalled(); expect(create).toHaveBeenCalledOnce();
  });
  it('honors explicitly disabled registration CAPTCHA', async () => {
    settings.registerVerify = 1;
    await expect(loginService.register(c, input())).resolves.toEqual({ regVerifyOpen: false });
    expect(fetchMock).not.toHaveBeenCalled(); expect(create).toHaveBeenCalledOnce();
  });
  it('falls back to the default role if an optional invitation is consumed by a competing request', async () => {
    settings.regKey = 2;
    vi.spyOn(loginService,'handleOpenOptional').mockResolvedValue({type:2,regKeyId:1});
    vi.spyOn(roleService,'selectDefaultRole').mockResolvedValue({roleId:3,availDomain:'allowed.example'});
    create.mockResolvedValueOnce(null).mockResolvedValueOnce(10);
    await expect(loginService.register(c,input({token:'test-token'}))).resolves.toEqual({regVerifyOpen:true});
    expect(create.mock.calls[1][1]).toMatchObject({type:3,regKeyId:0});
    expect(create.mock.calls[1][2]).toBeUndefined();
  });
});
