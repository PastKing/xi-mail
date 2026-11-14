import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createHmac} from 'node:crypto';
const require=createRequire(resolve('node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare'),{build}=require('esbuild');
let runtime;
// Independent authenticator implementation; no OTPAuth generator shared with the service.
function authenticator(uri,time=Date.now()) {
  const secret=new URL(uri).searchParams.get('secret'),alphabet=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).join('')+'234567';
  let bits=''; for(const ch of secret)bits+=alphabet.indexOf(ch).toString(2).padStart(5,'0');
  const bytes=Buffer.from((bits.match(/.{8}/g)||[]).map(chunk=>parseInt(chunk,2))),counter=Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time/30000)));
  const hmac=createHmac('sha1',bytes).update(counter).digest(),offset=hmac[19]&15;
  return String((hmac.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
beforeAll(async()=>{
  const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
    import service from './src/service/two-factor-service.js';
    import users from './src/service/user-service.js';
    import sessions from './src/service/session-service.js';
    import password from './src/utils/crypto-utils.js';
    users.selectByIdIncludeDel=async()=>({userId:1,email:'test@example.test',isDel:0,status:0,password:'test-hash',salt:'test-salt'});
    password.verifyPassword=async value=>value==='test-password';
    sessions.revokeOthers=async()=>{};
    export default {async fetch(request,env){const c={env,req:{url:request.url,header:()=> '192.0.2.1'}};
      try { const data=await request.json(); const path=new URL(request.url).pathname;
        if(path==='/setup')return Response.json(await service.setup(c,1,'test-session',data.password));
        if(path==='/confirm')return Response.json(await service.confirm(c,1,'test-session',data.code,data.enrollmentId));
        if(path==='/status')return Response.json(await service.status(c,1));
      }catch(error){return Response.json({error:error.message},{status:400});}
    }};
  `},bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'isolate-account-fixture',setup(build){
    build.onLoad({filter:/[\\/]service[\\/](user-service|session-service)\.js$/},()=>({contents:'export default {};',loader:'js'}));
  }}]});
  runtime=new Miniflare({modules:true,script:bundle.outputFiles[0].text,d1Databases:['db'],bindings:{two_factor_key:'runtime-private-two-factor-key-1234567890-abcdef'},outboundService:()=>{throw Error('Network disabled');}});
},20000);
afterAll(async()=>runtime?.dispose());
describe('TOTP across real Workers requests and local D1',()=>{
  it('accepts an independent authenticator code from the supplied URI',async()=>{
    const post=(path,body)=>runtime.dispatchFetch('https://local.test'+path,{method:'POST',body:JSON.stringify(body)});
    const setup=await (await post('/setup',{password:'test-password'})).json();
    expect(setup.uri).toContain('otpauth://');
    expect(new URL(setup.uri).searchParams.get('secret')).toBe(setup.secret);
    const reopened=await (await post('/setup',{password:'test-password'})).json();
    expect(reopened.enrollmentId).not.toBe(setup.enrollmentId);
    expect(new URL(reopened.uri).searchParams.get('secret')).toBe(reopened.secret);
    const code=authenticator(setup.uri);
    const response=await post('/confirm',{code:code.slice(0,3)+' '+code.slice(3),enrollmentId:setup.enrollmentId});
    const result=await response.json();expect(result.error).toBeUndefined();expect(response.status).toBe(200);expect(result.recoveryCodes).toHaveLength(8);
    expect(await (await post('/status',{})).json()).toEqual({enabled:true,recoveryRemaining:8});
  });
});
