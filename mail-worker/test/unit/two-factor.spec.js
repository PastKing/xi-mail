import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { TOTP, Secret } from 'otpauth';
import twoFactor, { totpFor, normalizeFactorCode } from '../../src/service/two-factor-service';
import userService from '../../src/service/user-service';
import sessionService from '../../src/service/session-service';
import cryptoUtils from '../../src/utils/crypto-utils';
import loginService from '../../src/service/login-service';
import publicService from '../../src/service/public-service';
import worker from '../../src/index';
let sql, c, user;
function adapter(db) {
  const prepare = (query, args = []) => ({ bind: (...values) => prepare(query, values),
    first: async () => db.prepare(query).get(...args) || null,
    run: async () => ({meta:db.prepare(query).run(...args)}),
    all: async () => ({results:db.prepare(query).all(...args)}) });
  return {prepare};
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T03:00:00Z'));
  sql = new DatabaseSync(':memory:');
  user = {userId:1,email:'owner@example.test',password:'hashed-password',salt:'salt',status:0,isDel:0};
  c = {env:{db:adapter(sql),two_factor_key:'private-two-factor-key-unique-characters-123456789',admin:user.email},req:{url:'https://local.test/api/my/two-factor',header:()=> '192.0.2.1'}};
  vi.spyOn(userService,'selectByIdIncludeDel').mockImplementation(async()=>user);
  vi.spyOn(userService,'selectByEmailIncludeDel').mockImplementation(async()=>user);
  vi.spyOn(userService,'upgradePasswordHash').mockResolvedValue(undefined);
  vi.spyOn(cryptoUtils,'verifyPassword').mockImplementation(async password=>password==='correct-password');
  vi.spyOn(sessionService,'revokeOthers').mockResolvedValue(undefined);
});
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();sql.close();});
async function enable() {
  const setup=await twoFactor.setup(c,1,'session','correct-password');
  const result=await twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate(),setup.enrollmentId);
  return {...setup,...result};
}
const next = () => vi.advanceTimersByTime(30000);
describe('Authenticator enrollment and encrypted state',()=>{
  it.each([[59000,'94287082'],[1111111109000,'07081804'],[1111111111000,'14050471'],[1234567890000,'89005924']])('matches RFC 6238 SHA1 vector %s', (timestamp,code)=>{
    const secret = new TextEncoder().encode('12345678901234567890');
    expect(new TOTP({secret:new Secret({buffer:secret.buffer}),digits:8,algorithm:'SHA1',period:30}).generate({timestamp})).toBe(code);
  });
  it('requires a correct password and only enables after a valid session-bound code',async()=>{
    await expect(twoFactor.setup(c,1,'session','wrong')).rejects.toMatchObject({code:400});
    const setup=await twoFactor.setup(c,1,'session','correct-password');
    expect(setup.uri).toContain('otpauth://totp/'); expect(setup.uri).toContain('period=30');
    expect(await twoFactor.status(c,1)).toEqual({enabled:false,recoveryRemaining:0});
    await expect(twoFactor.confirm(c,1,'different',totpFor(setup.secret).generate(),setup.enrollmentId)).rejects.toMatchObject({code:400});
    await expect(twoFactor.confirm(c,1,'session','invalid',setup.enrollmentId)).rejects.toMatchObject({code:400});
    const result=await twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate(),setup.enrollmentId);
    expect(result.recoveryCodes).toHaveLength(8);
    expect(await twoFactor.status(c,1)).toEqual({enabled:true,recoveryRemaining:8});
    const row=await twoFactor.row(c,1);
    expect(row.secret).not.toContain(setup.secret); expect(row.recovery).not.toContain(result.recoveryCodes[0]);
    expect(sessionService.revokeOthers).toHaveBeenCalledWith(c,1,'session');
    await expect(twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate(),setup.enrollmentId)).rejects.toMatchObject({code:400});
  });
  it('expires pending enrollment and invalidates it after a password change',async()=>{
    const setup=await twoFactor.setup(c,1,'session','correct-password');
    user.password='changed';
    await expect(twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate(),setup.enrollmentId)).rejects.toMatchObject({code:400});
    vi.advanceTimersByTime(601000);
    await expect(twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate(),setup.enrollmentId)).rejects.toMatchObject({code:400});
    await twoFactor.cleanup(c); expect(sql.prepare('SELECT COUNT(*) AS n FROM two_factor_pending').get().n).toBe(0);
  });
  it('keeps reopened enrollments independent and bound to the owner and session',async()=>{
    const first=await twoFactor.setup(c,1,'session','correct-password');
    const second=await twoFactor.setup(c,1,'session','correct-password');
    expect(first.enrollmentId).not.toBe(second.enrollmentId);
    expect(sql.prepare("SELECT COUNT(*) AS n FROM two_factor_pending WHERE kind='setup'").get().n).toBe(2);
    const code=totpFor(first.secret).generate();
    await expect(twoFactor.confirm(c,2,'session',code,first.enrollmentId)).rejects.toMatchObject({code:400});
    await expect(twoFactor.confirm(c,1,'other-session',code,first.enrollmentId)).rejects.toMatchObject({code:400});
    await expect(twoFactor.confirm(c,1,'session',code,'invalid')).rejects.toMatchObject({code:400});
    await expect(twoFactor.confirm(c,1,'session',code,first.enrollmentId)).resolves.toHaveProperty('recoveryCodes');
    expect(sql.prepare('SELECT COUNT(*) AS n FROM two_factor_pending').get().n).toBe(0);
    await expect(twoFactor.confirm(c,1,'session',totpFor(second.secret).generate(),second.enrollmentId)).rejects.toMatchObject({code:400});
  });
  it('distinguishes an expired enrollment from a wrong authenticator code',async()=>{
    const setup=await twoFactor.setup(c,1,'session','correct-password');
    await expect(twoFactor.confirm(c,1,'session','bad',setup.enrollmentId)).rejects.toThrow('验证码不正确');
    vi.advanceTimersByTime(600000);
    await expect(twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate(),setup.enrollmentId)).rejects.toThrow('本次绑定已过期');
  });
  it('normalizes grouped and fullwidth digits without changing replay checks',async()=>{
    expect(normalizeFactorCode('０１２ ３４５')).toBe('012345');
    expect(normalizeFactorCode(123456)).toBe('');
    expect(normalizeFactorCode(' '.repeat(65))).toBe('');
    const setup=await twoFactor.setup(c,1,'session','correct-password');
    const format=code=>code.replace(/\d/g,d=>String.fromCharCode(0xff10+Number(d))).replace(/(.{3})/,'$1 ');
    await twoFactor.confirm(c,1,'session',format(totpFor(setup.secret).generate()),setup.enrollmentId);
    const row=await twoFactor.row(c,1);
    await expect(twoFactor.consume(c,row,format(totpFor(setup.secret).generate()))).rejects.toThrow('此验证码已使用');
    next();
    await expect(twoFactor.consume(c,row,format(totpFor(setup.secret).generate()))).resolves.toBeUndefined();
  });
  it('accepts a still-valid legacy enrollment during deployment',async()=>{
    const setup=await twoFactor.setup(c,1,'session','correct-password');
    const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
    const pending=sql.prepare('SELECT * FROM two_factor_pending WHERE id=?').get(await hash(setup.enrollmentId));
    const payload=JSON.parse(pending.payload);delete payload.session;
    sql.prepare('UPDATE two_factor_pending SET id=?,payload=? WHERE id=?').run(await hash('setup:1:session'),JSON.stringify(payload),pending.id);
    await expect(twoFactor.confirm(c,1,'session',totpFor(setup.secret).generate())).resolves.toHaveProperty('recoveryCodes');
  });
  it('requires an independent strong encryption key and fails closed on ciphertext tampering',async()=>{
    c.env.two_factor_key='short';await expect(twoFactor.setup(c,1,'session','correct-password')).rejects.toMatchObject({code:503});
    c.env.two_factor_key='private-two-factor-key-unique-characters-123456789';
    const setup=await enable(); next();
    const row=await twoFactor.row(c,1); const ciphertext=JSON.parse(row.secret);ciphertext[1][0]^=1;row.secret=JSON.stringify(ciphertext);
    await expect(twoFactor.consume(c,row,totpFor(setup.secret).generate())).rejects.toBeDefined();
    row.secret=(await twoFactor.row(c,1)).secret;row.user_id=2;
    await expect(twoFactor.consume(c,row,totpFor(setup.secret).generate())).rejects.toBeDefined();
  });
  it('prevents TOTP reuse including simultaneous attempts',async()=>{
    const setup=await enable(), row=await twoFactor.row(c,1);
    await expect(twoFactor.consume(c,row,totpFor(setup.secret).generate())).rejects.toMatchObject({code:400});
    next();const code=totpFor(setup.secret).generate();
    const results=await Promise.allSettled([twoFactor.consume(c,row,code),twoFactor.consume(c,row,code)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  });
  it('consumes recovery codes only once atomically',async()=>{
    const setup=await enable(), row=await twoFactor.row(c,1), code=setup.recoveryCodes[0];
    const results=await Promise.allSettled([twoFactor.consume(c,row,code),twoFactor.consume(c,row,code)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await twoFactor.status(c,1)).recoveryRemaining).toBe(7);
    await expect(twoFactor.consume(c,await twoFactor.row(c,1),code)).rejects.toMatchObject({code:400});
  });
  it('requires password and code to disable, then revokes other sessions',async()=>{
    const setup=await enable();sessionService.revokeOthers.mockClear();next();
    await expect(twoFactor.disable(c,1,'session','wrong',totpFor(setup.secret).generate())).rejects.toMatchObject({code:400});
    await expect(twoFactor.disable(c,1,'session','correct-password','wrong')).rejects.toMatchObject({code:400});
    expect((await twoFactor.status(c,1)).enabled).toBe(true);
    await twoFactor.disable(c,1,'session','correct-password',setup.recoveryCodes[0]);
    expect((await twoFactor.status(c,1)).enabled).toBe(false);
    expect(sessionService.revokeOthers).toHaveBeenCalledWith(c,1,'session');
  });
});
describe('Two-stage login boundaries',()=>{
  it.each([false,true])('does not issue a session until password/OAuth plus TOTP are verified (%s)',async oauth=>{
    const setup=await enable();next();const issue=vi.spyOn(loginService,'createSession').mockResolvedValue('verified-session');
    const response=await loginService.login(c,{email:user.email,password:'correct-password'},oauth);
    expect(response.requiresTwoFactor).toBe(true);expect(response.token).toBeUndefined();expect(issue).not.toHaveBeenCalled();
    await expect(loginService.completeTwoFactor(c,{challenge:response.challenge,code:'wrong'})).rejects.toMatchObject({code:400});
    expect(issue).not.toHaveBeenCalled();
    expect(await loginService.completeTwoFactor(c,{challenge:response.challenge,code:totpFor(setup.secret).generate()})).toBe('verified-session');
    expect(issue).toHaveBeenCalledWith(c,user,oauth?'oauth':'password');
    next();await expect(loginService.completeTwoFactor(c,{challenge:response.challenge,code:totpFor(setup.secret).generate()})).rejects.toMatchObject({code:400});
  });
  it('keeps ordinary login compatible and rejects wrong passwords before challenging',async()=>{
    const issue=vi.spyOn(loginService,'createSession').mockResolvedValue('ordinary-session');
    expect(await loginService.login(c,{email:user.email,password:'correct-password'})).toBe('ordinary-session');
    await expect(loginService.login(c,{email:user.email,password:'wrong'})).rejects.toBeDefined();
    expect(issue).toHaveBeenCalledTimes(1);
  });
  it.each(['expired','password','banned','deleted','disabled'])('rejects a stale challenge: %s',async mode=>{
    const setup=await enable(), challenge=await twoFactor.challenge(c,user,'password');next();
    if(mode==='expired')vi.advanceTimersByTime(300000);
    if(mode==='password')user.password='different';
    if(mode==='banned')user.status=1;
    if(mode==='deleted')user.isDel=1;
    if(mode==='disabled')sql.exec('DELETE FROM user_two_factor');
    await expect(twoFactor.verifyLogin(c,challenge.challenge,totpFor(setup.secret).generate())).rejects.toMatchObject({code:400});
  });
  it('rate limits invalid codes across challenges and management attempts',async()=>{
    await enable();const row=await twoFactor.row(c,1);
    for(let i=0;i<8;i++)await expect(twoFactor.consume(c,row,'bad')).rejects.toMatchObject({code:400});
    await expect(twoFactor.consume(c,row,'bad')).rejects.toMatchObject({code:429});
  });
  it('does not let public token generation bypass MFA',async()=>{
    const setup=await enable();
    await expect(publicService.verifyUser(c,{email:user.email,password:'correct-password'})).rejects.toMatchObject({code:400});
    await expect(publicService.verifyUser(c,{email:user.email,password:'correct-password',code:setup.recoveryCodes[0]})).resolves.toBeUndefined();
  });
  it.each(['/api/my/two-factor','/api/my/two-factor/setup','/api/my/two-factor/confirm','/api/my/two-factor/disable'])('protects account management route %s',async path=>{
    const method=path.endsWith('two-factor')?'GET':'POST';
    const response=await worker.fetch(new Request('https://local.test'+path,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?'{}':undefined}),c.env,{});
    expect((await response.json()).code).toBe(401);
  });
});
