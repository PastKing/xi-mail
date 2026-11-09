import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve('node_modules/wrangler/package.json'));
const { Miniflare } = require('miniflare');
const { build } = require('esbuild');
let runtime, requests, replies;

beforeAll(async () => {
  const bundle = await build({
    stdin: { resolveDir: process.cwd(), contents: `
      import service from './src/service/sendflare-service.js';
      export default { async fetch(request) {
        const form = {from:'owner@example.test',to:['recipient@example.test'],subject:'Test',html:'<p>Test</p>'};
        if (new URL(request.url).pathname === '/batch') form.to.push('second@example.test');
        try {return Response.json({id:await service.send('runtime-test-token',form)});}
        catch (error) {return Response.json({error:error.message},{status:502});}
      }};`,
    },
    bundle: true, write: false, format: 'esm', platform: 'browser',
  });
  runtime = new Miniflare({ modules: true, script: bundle.outputFiles[0].text,
    outboundService: request => {
      requests.push({url:request.url,method:request.method,authorization:request.headers.get('authorization')});
      const response = replies.shift();
      if (!response) throw new Error('Unexpected outbound request; network access disabled');
      return response;
    },
  });
}, 15000);
beforeEach(() => { requests = []; replies = []; });
afterEach(() => { expect(replies).toHaveLength(0); });
afterAll(async () => { await runtime?.dispose(); });

describe('SendFlare in the Workers runtime', () => {
  it('sends single and batch requests using runtime-supported redirect handling', async () => {
    replies.push(Response.json({success:true,data:{emilId:'single-id'}}), Response.json({success:true,data:['first-id','second-id']}));
    const single = await runtime.dispatchFetch('https://local.test/');
    expect(await single.json()).toEqual({id:'single-id'});
    const batch = await runtime.dispatchFetch('https://local.test/batch');
    expect(await batch.json()).toEqual({id:'first-id,second-id'});
    expect(requests).toEqual([
      {url:'https://api.sendflare.com/v1/send',method:'POST',authorization:'Bearer runtime-test-token'},
      {url:'https://api.sendflare.com/v1/batchSend',method:'POST',authorization:'Bearer runtime-test-token'},
    ]);
  });
  it('rejects a redirect without forwarding authorization or repeating the request', async () => {
    replies.push(new Response(null, {status:307,headers:{location:'https://untrusted.example/collect'}}));
    const result = await runtime.dispatchFetch('https://local.test/');
    expect(result.status).toBe(502);
    expect((await result.json()).error).toContain('unexpected redirect (HTTP 307)');
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.sendflare.com/v1/send');
  });
  it('records a successful batch receipt without requiring individual delivery IDs or retrying', async () => {
    replies.push(Response.json({success:true,code:0,requestId:'accepted-batch-request',data:null}));
    const result = await runtime.dispatchFetch('https://local.test/batch');
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({id:'request:accepted-batch-request'});
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.sendflare.com/v1/batchSend');
  });
  it('preserves actionable provider rejection details', async () => {
    replies.push(Response.json({success:false,code:100030,message:'The sending domain is invalid'}));
    const result = await runtime.dispatchFetch('https://local.test/');
    expect((await result.json()).error).toContain('The sending domain is invalid (HTTP 200, code 100030)');
    expect(requests).toHaveLength(1);
  });
});
