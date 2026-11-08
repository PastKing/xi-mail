import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
let DatabaseSync;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* SQLite-backed tests require Node 22+. */ }
import oauthService from '../../src/service/oauth-service';
import bindings from '../../src/service/oauth-binding-service';
import configService from '../../src/service/linuxdo-config-service';
import loginService from '../../src/service/login-service';
import userService from '../../src/service/user-service';
import settingService from '../../src/service/setting-service';
import oauthConfig from '../../src/service/oauth-config-service';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const telegramKeys = await generateKeyPair('RS256');
const telegramJwk = { ...await exportJWK(telegramKeys.publicKey), kid: 'telegram-test', alg: 'RS256', use: 'sig' };
const googleKeys = await generateKeyPair('RS256');
const googleJwk = { ...await exportJWK(googleKeys.publicKey), kid: 'google-test', alg:'RS256', use:'sig' };

async function configureProvider(id) {
  await oauthConfig.save(c, { [id + 'Switch']: true, [id + 'ClientId']: id === 'telegram' ? '123456789' : id === 'discord' ? '123456789012345678' : id + '-client',
    [id + 'ClientSecret']: `${id}-fixture-secret`, [id + 'CallbackUrl']: `https://mail.example.com/oauth/${id}` }, id);
}
function mockTelegram(overrides = {}, signingKey = telegramKeys.privateKey) {
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    let data;
    if (url.toString().endsWith('/jwks.json')) data = { keys: [telegramJwk] };
    else {
      expect(url).toBe('https://oauth.telegram.org/token');
      const pending = [...values.entries()].filter(([key]) => key.startsWith('oauth:telegram:state:'));
      // finish consumes state before exchange, so read the nonce from the captured authorization URL.
      expect(pending).toHaveLength(0);
      expect(options.headers.Authorization).toBe('Basic ' + btoa('123456789:telegram-fixture-secret'));
      expect(options.body.get('client_id')).toBe('123456789');
      expect(options.body.get('code_verifier')).toMatch(/^[a-f0-9]{64}$/);
      data = { id_token: await new SignJWT({ id: 987654321, name: 'Telegram Test', preferred_username: 'tg-user',
        nonce: telegramNonce, ...overrides }).setProtectedHeader({ alg: 'RS256', kid: telegramJwk.kid })
        .setIssuer(overrides.iss ?? 'https://oauth.telegram.org').setAudience(overrides.aud ?? '123456789')
        .setSubject('pairwise-subject').setIssuedAt().setExpirationTime(overrides.exp ?? '5m').sign(signingKey) };
    }
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  }));
}
let telegramNonce;
let googleNonce;
function mockGoogle(claims={}, key=googleKeys.privateKey) {
  vi.stubGlobal('fetch', vi.fn(async (url,options) => {
    if (url.toString()==='https://www.googleapis.com/oauth2/v3/certs') return Response.json({keys:[googleJwk]});
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(options.body.get('code_verifier')).toMatch(/^[a-f0-9]{64}$/);
    expect(options.body.get('client_id')).toBe('google-client');
    expect(options.body.get('client_secret')).toBe('google-fixture-secret');
    return Response.json({id_token: await new SignJWT({nonce:googleNonce,name:'Google User',...claims})
      .setProtectedHeader({alg:'RS256',kid:googleJwk.kid}).setIssuer(claims.iss ?? 'https://accounts.google.com')
      .setAudience(claims.aud ?? 'google-client').setSubject(claims.sub ?? 'stable-google-sub')
      .setIssuedAt().setExpirationTime(claims.exp ?? '5m').sign(key)});
  }));
}
function mockGitHub(info={}) {
  vi.stubGlobal('fetch',vi.fn(async (url,options) => {
    if (url==='https://github.com/login/oauth/access_token') {
      expect(options.body.get('client_id')).toBe('github-client');
      expect(options.body.get('code_verifier')).toMatch(/^[a-f0-9]{64}$/);
      return Response.json({access_token:'github-fixture-access'});
    }
    expect(url).toBe('https://api.github.com/user');
    expect(options.headers['User-Agent']).toBe('Xi-Mail');
    return Response.json({id:789,login:'github-login',name:'Display Name',...info});
  }));
}
function mockDiscord(info={}) {
  vi.stubGlobal('fetch',vi.fn(async (url,options) => {
    if (url==='https://discord.com/api/oauth2/token') {
      expect(options.headers.Authorization).toBe('Basic '+btoa('123456789012345678:discord-fixture-secret'));
      expect(options.body.get('grant_type')).toBe('authorization_code');
      expect(options.body.get('redirect_uri')).toBe('https://mail.example.com/oauth/discord');
      expect(options.body.get('code_verifier')).toMatch(/^[a-f0-9]{64}$/);
      expect(options.body.has('client_secret')).toBe(false);
      return Response.json({access_token:'discord-fixture-access',token_type:'Bearer',scope:'identify'});
    }
    expect(url).toBe('https://discord.com/api/v10/users/@me');
    expect(options.headers.Authorization).toBe('Bearer discord-fixture-access');
    return Response.json({id:'80351110224678912',username:'discord-user',global_name:'Discord User',...info});
  }));
}
async function authorizeTelegram(intent = 'bind') {
  const flow = await oauthService.authorize(c, intent, 'telegram');
  telegramNonce = new URL(flow.authorizationUrl).searchParams.get('nonce');
  return flow;
}

function d1(db) {
  const prepare = (sql, params = []) => ({
    bind: (...values) => prepare(sql, values),
    run: async () => ({ success: true, meta: db.prepare(sql).run(...params) }),
    all: async () => ({ success: true, results: db.prepare(sql).all(...params) }),
    raw: async () => { const stmt = db.prepare(sql); stmt.setReturnArrays(true); return stmt.all(...params); },
  });
  return { prepare };
}
let sql, values, c;
function context(userId = 10, session = 'session-a') {
  const local = new Map([['user', { userId, email: `user${userId}@example.com` }], ['token', session]]);
  return { env: { db: d1(sql), kv: {
    get: async (key, options) => { const value = values.get(key); return value === undefined ? null : options?.type === 'json' ? JSON.parse(value) : value; },
    put: async (key, value) => { values.set(key, value); },
    delete: async key => { values.delete(key); },
  } }, get: key => local.get(key), set: (key, value) => local.set(key, value) };
}
function provider(info = {}) {
  return vi.stubGlobal('fetch', vi.fn(async url => new Response(JSON.stringify(url.endsWith('/token')
    ? { access_token: '{{SECRET_wb2vopt0}}' }
    : { id: 42, username: 'provider-user', active: true, silenced: false, trust_level: 2, ...info }),
  { headers: { 'Content-Type': 'application/json' } })));
}
beforeEach(async () => {
  sql = new DatabaseSync(':memory:'); values = new Map();
  sql.exec(`CREATE TABLE oauth (oauth_id INTEGER PRIMARY KEY, oauth_user_id TEXT, user_id INTEGER DEFAULT 0, username TEXT, name TEXT)`);
  c = context();
  await configService.save(c, { linuxdoSwitch: true, linuxdoClientId: 'test-app', linuxdoClientSecret: 'test-client-secret',
    linuxdoCallbackUrl: 'https://mail.example.com/oauth/linuxdo', linuxdoMinTrustLevel: 1 });
});

describe.skipIf(!DatabaseSync)('OAuth provider integrations', () => {
  it.each(['github','google','discord'])('configures %s independently, without exposing secrets',async id=>{
    await configureProvider(id); await oauthConfig.save(c,{[id+'ClientSecret']:''},id);
    expect((await oauthConfig.get(c,id)).clientSecret).toBe(id+'-fixture-secret');
    await expect(oauthConfig.save(c,{[id+'CallbackUrl']:'https://mail.example.com/oauth/other'},id)).rejects.toMatchObject({code:400});
    expect((await configService.get(c)).clientId).toBe('test-app');
  });
  it('binds GitHub by stable numeric ID and display login, without repository or email scopes',async()=>{
    await configureProvider('github'); mockGitHub();
    const flow=await oauthService.authorize(c,'bind','github'),url=new URL(flow.authorizationUrl);
    expect(url.searchParams.get('scope')).toBeNull();
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('nonce')).toBeNull();
    await oauthService.finish(c,{code:'fixture',state:flow.state},'bind','github');
    expect(await bindings.findIdentity(c,'github','789')).toMatchObject({userId:10,displayName:'github-login'});
  });
  it('uses Discord identify-only authorization with PKCE and binds the exact snowflake ID',async()=>{
    await configureProvider('discord');mockDiscord();
    const flow=await oauthService.authorize(c,'bind','discord'),url=new URL(flow.authorizationUrl);
    expect(url.origin+url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('scope')).toBe('identify');expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.has('nonce')).toBe(false);expect(url.searchParams.get('redirect_uri')).toBe('https://mail.example.com/oauth/discord');
    expect(await oauthService.finish(c,{code:'fixture',state:flow.state},'bind','discord')).toEqual({bound:true});
    expect(await bindings.findIdentity(c,'discord','80351110224678912')).toMatchObject({userId:10,displayName:'Discord User'});
    await expect(oauthService.finish(c,{code:'fixture',state:flow.state},'bind','discord')).rejects.toMatchObject({code:400});
  });
  it('requires an explicit Discord binding, never matches the returned email, and then logs into the bound mailbox',async()=>{
    await configureProvider('discord');mockDiscord({email:'user10@example.com'});
    const login=vi.spyOn(loginService,'login').mockResolvedValue('session-token');
    let flow=await oauthService.authorize(c,'login','discord');
    await expect(oauthService.finish(c,{code:'fixture',state:flow.state},'login','discord')).rejects.toMatchObject({code:403});
    expect(login).not.toHaveBeenCalled();
    await bindings.bind(c,10,'discord','80351110224678912','Discord User');
    vi.spyOn(userService,'selectByIdIncludeDel').mockResolvedValue({userId:10,email:'user10@example.com'});
    flow=await oauthService.authorize(c,'login','discord');
    expect(await oauthService.finish(c,{code:'fixture',state:flow.state},'login','discord')).toEqual({token:'session-token'});
    expect(login).toHaveBeenCalledWith(c,{email:'user10@example.com'},true);
  });
  it('rejects Discord binding from a changed session before exchanging the code',async()=>{
    await configureProvider('discord');mockDiscord();
    const flow=await oauthService.authorize(c,'bind','discord');
    await expect(oauthService.finish(context(10,'another-session'),{code:'fixture',state:flow.state},'bind','discord')).rejects.toMatchObject({code:403});
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{id:9007199254740992},{id:'not-an-id'},{bot:true},{system:true}])('rejects invalid Discord identities %j',async info=>{
    await configureProvider('discord');mockDiscord(info);
    const flow=await oauthService.authorize(c,'bind','discord');
    await expect(oauthService.finish(c,{code:'fixture',state:flow.state},'bind','discord')).rejects.toMatchObject({code:403});
  });
  it('uses the Discord username when no display name is set and supports unbinding',async()=>{
    await configureProvider('discord');mockDiscord({global_name:null});
    const flow=await oauthService.authorize(c,'bind','discord');
    await oauthService.finish(c,{code:'fixture',state:flow.state},'bind','discord');
    expect(await bindings.findIdentity(c,'discord','80351110224678912')).toMatchObject({displayName:'discord-user'});
    await oauthService.remove(c,10,'discord');expect(await bindings.findIdentity(c,'discord','80351110224678912')).toBeFalsy();
  });
  it('verifies Google signatures/nonce and binds the OIDC subject rather than the email address',async()=>{
    await configureProvider('google'); mockGoogle({email:'someone@example.com',email_verified:true});
    const flow=await oauthService.authorize(c,'bind','google'),url=new URL(flow.authorizationUrl);
    googleNonce=url.searchParams.get('nonce');
    expect(url.searchParams.get('scope')).toBe('openid profile');
    await oauthService.finish(c,{code:'fixture',state:flow.state},'bind','google');
    expect(await bindings.findIdentity(c,'google','stable-google-sub')).toMatchObject({userId:10,displayName:'Google User'});
    expect(await bindings.findIdentity(c,'google','someone@example.com')).toBeUndefined();
  });
  it.each([{iss:'https://attacker.example'},{aud:'other-client'},{nonce:'wrong'},{sub:''},{sub:'bad/subject'},
    {exp:Math.floor(Date.now()/1000)-100},{aud:['google-client','other'],azp:'other'},{azp:'other'}])('rejects Google identity claims %j',async claims=>{
    await configureProvider('google');mockGoogle(claims);
    const flow=await oauthService.authorize(c,'bind','google');googleNonce=new URL(flow.authorizationUrl).searchParams.get('nonce');
    await expect(oauthService.finish(c,{code:'fixture',state:flow.state},'bind','google')).rejects.toMatchObject({code:400});
  });
  it('rejects forged Google signatures',async()=>{
    await configureProvider('google');const wrong=await generateKeyPair('RS256');mockGoogle({},wrong.privateKey);
    const flow=await oauthService.authorize(c,'bind','google');googleNonce=new URL(flow.authorizationUrl).searchParams.get('nonce');
    await expect(oauthService.finish(c,{code:'fixture',state:flow.state},'bind','google')).rejects.toMatchObject({code:400});
  });
  it.each(['github','google'])('requires an existing binding for %s and rejects a different binding session',async id=>{
    await configureProvider(id);if(id==='google')mockGoogle();else mockGitHub();
    let flow=await oauthService.authorize(c,'login',id);googleNonce=new URL(flow.authorizationUrl).searchParams.get('nonce');
    await expect(oauthService.finish(c,{code:'fixture',state:flow.state},'login',id)).rejects.toMatchObject({code:403});
    await bindings.bind(c,10,id,id==='google'?'stable-google-sub':'789','existing');
    const login=vi.spyOn(loginService,'login').mockResolvedValue('session-token');
    vi.spyOn(userService,'selectByIdIncludeDel').mockResolvedValue({userId:10,email:'user10@example.com'});
    flow=await oauthService.authorize(c,'login',id);googleNonce=new URL(flow.authorizationUrl).searchParams.get('nonce');
    expect(await oauthService.finish(c,{code:'fixture',state:flow.state},'login',id)).toEqual({token:'session-token'});
    expect(login).toHaveBeenCalledWith(c,{email:'user10@example.com'},true);
    flow=await oauthService.authorize(c,'bind',id);
    await expect(oauthService.finish(context(10,'different-session'),{code:'fixture',state:flow.state},'bind',id)).rejects.toMatchObject({code:403});
  });
  it.each(['telegram', 'nodeloc'])('isolates %s configuration and preserves secrets and existing bindings', async id => {
    await configureProvider(id);
    await oauthConfig.save(c, { [id + 'ClientSecret']: '' }, id);
    expect((await oauthConfig.get(c, id)).clientSecret).toBe(`${id}-fixture-secret`);
    expect((await configService.get(c)).clientId).toBe('test-app');
    await bindings.bind(c, 10, id, '987654321', 'existing');
    await configureProvider(id);
    expect(await bindings.findIdentity(c, id, '987654321')).toMatchObject({ userId: 10 });
    await expect(oauthConfig.save(c, { [id + 'CallbackUrl']: 'https://mail.example.com/oauth/linuxdo' }, id)).rejects.toMatchObject({ code: 400 });
  });
  it('keeps all provider secrets out of administrative and public settings', async () => {
    await configureProvider('telegram'); await configureProvider('nodeloc'); await configureProvider('discord');
    values.set('setting:', JSON.stringify({ aiCode: 0, aiModel: 'test', queenTokens: {}, sendProviders: {},
      emailPrefixFilter: '', subWorkerDomains: [], managedDomains: '[]' }));
    const settings = await settingService.query(c);
    expect(settings).toMatchObject({ telegramSwitch: true, nodelocSwitch: true, discordSwitch: true, telegramHasSecret: true, nodelocHasSecret: true, discordHasSecret: true });
    expect(JSON.stringify(settings)).not.toContain('fixture-secret');
    expect(Object.keys(settings).filter(key => key.endsWith('ClientSecret'))).toEqual([]);
  });
  it('uses Telegram PKCE and binds the verified numeric Telegram ID instead of the OIDC subject', async () => {
    await configureProvider('telegram'); mockTelegram();
    const flow = await authorizeTelegram();
    const url = new URL(flow.authorizationUrl);
    const pending = JSON.parse(values.get('oauth:telegram:state:' + flow.state));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pending.verifier));
    expect(url.searchParams.get('code_challenge')).toBe(Buffer.from(digest).toString('base64url'));
    expect(url.searchParams.get('scope')).toBe('openid profile');
    expect(url.searchParams.get('nonce')).toBe(pending.nonce);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(await oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind', 'telegram')).toEqual({ bound: true });
    expect(await bindings.findIdentity(c, 'telegram', '987654321')).toMatchObject({ userId: 10, displayName: 'tg-user' });
    expect(await bindings.findIdentity(c, 'telegram', 'pairwise-subject')).toBeUndefined();
    await expect(oauthService.finish(c, { code: 'replay', state: flow.state }, 'bind', 'telegram')).rejects.toMatchObject({ code: 400 });
  });
  it.each([
    ['wrong audience', { aud: 'other-app' }], ['wrong issuer', { iss: 'https://attacker.example' }],
    ['expired token', { exp: 1000 }], ['wrong nonce', { nonce: 'forged' }], ['missing nonce', { nonce: undefined }],
    ['missing Telegram ID', { id: undefined }],
  ])('rejects Telegram %s', async (_, claims) => {
    await configureProvider('telegram'); mockTelegram(claims);
    const flow = await authorizeTelegram();
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind', 'telegram')).rejects.toMatchObject({ code: 400 });
    expect(await bindings.list(c, 10)).toHaveLength(0);
  });
  it('rejects forged Telegram signatures', async () => {
    await configureProvider('telegram');
    const forgedKeys = await generateKeyPair('RS256');
    mockTelegram({}, forgedKeys.privateKey);
    const flow = await authorizeTelegram();
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind', 'telegram')).rejects.toMatchObject({ code: 400 });
  });
  it('rejects cross-provider states before contacting the provider', async () => {
    await configureProvider('telegram'); await configureProvider('nodeloc'); mockTelegram();
    const flow = await authorizeTelegram();
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind', 'nodeloc')).rejects.toMatchObject({ code: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['telegram', 'nodeloc'])('requires the initiating session for %s binding', async id => {
    await configureProvider(id);
    const flow = await oauthService.authorize(c, 'bind', id);
    await expect(oauthService.finish(context(10, 'changed'), { code: 'ok', state: flow.state }, 'bind', id)).rejects.toMatchObject({ code: 403 });
  });
  it('exchanges NodeLoc codes using form credentials and fetches userinfo without email scope', async () => {
    await configureProvider('nodeloc'); provider();
    const flow = await oauthService.authorize(c, 'bind', 'nodeloc');
    expect(new URL(flow.authorizationUrl).searchParams.get('scope')).toBe('openid profile');
    expect(await oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind', 'nodeloc')).toEqual({ bound: true });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://www.nodeloc.com/oauth-provider/token');
    expect(options.body.get('client_secret')).toBe('nodeloc-fixture-secret');
    expect(options.body.get('client_id')).toBe('nodeloc-client');
    expect(options.headers.Authorization).toBeUndefined();
    expect(fetch.mock.calls[1][0]).toBe('https://www.nodeloc.com/oauth-provider/userinfo');
    expect(await bindings.findIdentity(c, 'nodeloc', '42')).toMatchObject({ userId: 10 });
  });
  it.each(['telegram', 'nodeloc'])('only logs in previously bound %s identities and keeps unlink scoped to the provider', async id => {
    await configureProvider(id);
    if (id === 'telegram') mockTelegram(); else provider();
    const register = vi.spyOn(loginService, 'register');
    let flow = id === 'telegram' ? await authorizeTelegram('login') : await oauthService.authorize(c, 'login', id);
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state }, 'login', id)).rejects.toThrow('尚未绑定');
    expect(register).not.toHaveBeenCalled();
    await bindings.bind(c, 10, id, id === 'telegram' ? '987654321' : '42', 'existing');
    await bindings.bind(c, 10, 'linuxdo', '42', 'other');
    vi.spyOn(userService, 'selectByIdIncludeDel').mockResolvedValue({ userId: 10, email: 'user10@example.com' });
    vi.spyOn(loginService, 'login').mockResolvedValue('site-session');
    flow = id === 'telegram' ? await authorizeTelegram('login') : await oauthService.authorize(c, 'login', id);
    expect(await oauthService.finish(c, { code: 'ok', state: flow.state }, 'login', id)).toEqual({ token: 'site-session' });
    await oauthService.remove(c, 10, id);
    expect((await oauthService.list(c, 10)).find(row => row.provider === id).binding).toBeNull();
    expect(await bindings.findIdentity(c, 'linuxdo', '42')).toMatchObject({ userId: 10 });
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sql.close(); });

describe.skipIf(!DatabaseSync)('OAuth configuration', () => {
  it('preserves a stored secret when the administrator leaves the field blank', async () => {
    await configService.save(c, { linuxdoClientSecret: '', linuxdoMinTrustLevel: 2 });
    expect((await configService.get(c)).clientSecret).toBe('test-client-secret');
  });
  it('supports existing deployment variables when no administrator override exists', async () => {
    values.clear();
    Object.assign(c.env, { linuxdo_switch: 'true', linuxdo_client_id: 'old-app', linuxdo_client_secret: 'old-secret', linuxdo_callback_url: 'https://example.com/oauth/linuxdo' });
    expect(await configService.require(c)).toMatchObject({ clientId: 'old-app', clientSecret: 'old-secret' });
  });
  it('rejects incomplete settings, unsafe callback URLs and invalid trust levels', async () => {
    await expect(configService.save(c, { linuxdoClientId: '' })).rejects.toMatchObject({ code: 400 });
    await expect(configService.save(c, { linuxdoCallbackUrl: 'http://public.example.com/callback' })).rejects.toMatchObject({ code: 400 });
    await expect(configService.save(c, { linuxdoMinTrustLevel: 5 })).rejects.toMatchObject({ code: 400 });
  });
  it.each(['/login', '/oauth/callback', '/oauth/linuxdo/callback', '/oauth/other'])('does not accept the old or unrelated callback path %s', async path => {
    await expect(configService.save(c, { linuxdoCallbackUrl: 'https://mail.example.com' + path })).rejects.toMatchObject({ code: 400 });
  });
  it('never returns the client secret in site settings', async () => {
    values.set('setting:', JSON.stringify({ aiCode: 0, aiModel: 'test', queenTokens: {}, sendProviders: {},
      emailPrefixFilter: '', subWorkerDomains: [], managedDomains: '[]' }));
    const settings = await settingService.query(c);
    expect(settings.linuxdoHasSecret).toBe(true);
    expect(JSON.stringify(settings)).not.toContain('test-client-secret');
  });
});

describe.skipIf(!DatabaseSync)('Authorization state and account binding', () => {
  it('uses a state nonce and refuses stale, wrong-purpose and changed-session callbacks', async () => {
    provider();
    const flow = await oauthService.authorize(c, 'bind');
    expect(new URL(flow.authorizationUrl).searchParams.get('state')).toBe(flow.state);
    await expect(oauthService.finish(c, { code: 'ok', state: '0'.repeat(64) })).rejects.toMatchObject({ code: 400 });
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state })).rejects.toMatchObject({ code: 400 });
    await expect(oauthService.finish(context(10, 'changed-session'), { code: 'ok', state: flow.state }, 'bind')).rejects.toMatchObject({ code: 403 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('binds an authorized identity to the authenticated mailbox, never to a client supplied ID', async () => {
    provider();
    const flow = await oauthService.authorize(c, 'bind');
    expect(await oauthService.finish(c, { code: 'ok', state: flow.state, userId: 999, oauthUserId: '999' }, 'bind')).toEqual({ bound: true });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Basic ' + btoa('test-app:test-client-secret'));
    expect(await bindings.findIdentity(c, 'linuxdo', '42')).toMatchObject({ userId: 10 });
    expect(await bindings.findIdentity(c, 'linuxdo', '999')).toBeUndefined();
    await expect(oauthService.finish(c, { code: 'replay', state: flow.state }, 'bind')).rejects.toMatchObject({ code: 400 });
  });
  it('rejects an identity already bound to another mailbox and one provider per user', async () => {
    await bindings.bind(c, 10, 'linuxdo', '42', 'first');
    await expect(bindings.bind(c, 11, 'linuxdo', '42', 'taken')).rejects.toMatchObject({ code: 409 });
    await expect(bindings.bind(c, 10, 'linuxdo', '43', 'second')).rejects.toMatchObject({ code: 409 });
    expect(await bindings.list(c, 10)).toHaveLength(1);
  });
  it('enforces minimum trust and rejects disabled provider accounts', async () => {
    provider({ trust_level: 0 });
    let flow = await oauthService.authorize(c, 'bind');
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind')).rejects.toMatchObject({ code: 403 });
    provider({ active: false });
    flow = await oauthService.authorize(c, 'bind');
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state }, 'bind')).rejects.toMatchObject({ code: 403 });
  });
  it('does not auto-register an unbound account or consume an invitation code', async () => {
    provider();
    const register = vi.spyOn(loginService, 'register');
    const flow = await oauthService.authorize(c);
    await expect(oauthService.finish(c, { code: 'ok', state: flow.state })).rejects.toThrow('尚未绑定');
    expect(register).not.toHaveBeenCalled();
  });
  it('does not reopen registration even if an old caller supplies the former OAuth flag', async () => {
    vi.spyOn(settingService, 'query').mockResolvedValue({ register: 1 });
    await expect(loginService.register(c, { email: 'new@example.com', password: 'password1' }, true)).rejects.toMatchObject({ name: 'BizError' });
  });
  it('logs in a bound mailbox using normal account status/session checks', async () => {
    provider();
    await bindings.bind(c, 10, 'linuxdo', '42', 'user');
    vi.spyOn(userService, 'selectByIdIncludeDel').mockResolvedValue({ userId: 10, email: 'user10@example.com' });
    const login = vi.spyOn(loginService, 'login').mockResolvedValue('site-jwt');
    const flow = await oauthService.authorize(c);
    expect(await oauthService.finish(c, { code: 'ok', state: flow.state })).toEqual({ token: 'site-jwt' });
    expect(login).toHaveBeenCalledWith(c, { email: 'user10@example.com' }, true);
  });
  it('does not allow anonymous binding or authorization while disabled', async () => {
    await expect(oauthService.authorize(context(null), 'bind')).rejects.toMatchObject({ code: 401 });
    await configService.save(c, { linuxdoSwitch: false });
    await expect(oauthService.authorize(c)).rejects.toMatchObject({ code: 403 });
  });
  it('does not leak provider identifiers or secrets in the personal connections list', async () => {
    await bindings.bind(c, 10, 'linuxdo', '42', 'provider-user');
    const list = await oauthService.list(c, 10);
    const linuxdo = list.find(provider => provider.provider === 'linuxdo');
    expect(linuxdo.binding.displayName).toBe('provider-user');
    expect(linuxdo.binding.providerUserId).toBeUndefined();
    expect(JSON.stringify(list)).not.toContain('test-client-secret');
  });
  it('preserves old LinuxDo bindings and respects ownership when unlinking', async () => {
    sql.prepare('INSERT INTO oauth VALUES (1, ?, ?, ?, ?)').run('42', 10, 'legacy', 'Legacy');
    expect(await bindings.findIdentity(c, 'linuxdo', '42')).toMatchObject({ userId: 10 });
    await bindings.remove(context(11), 11, 'linuxdo');
    expect(await bindings.findIdentity(c, 'linuxdo', '42')).toMatchObject({ userId: 10 });
    await bindings.remove(c, 10, 'linuxdo');
    expect(await bindings.findIdentity(c, 'linuxdo', '42')).toBeUndefined();
    expect(sql.prepare('SELECT user_id FROM oauth').get().user_id).toBe(0);
  });
});
