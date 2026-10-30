const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { build } = require('esbuild');
const { Miniflare } = require('miniflare');

test('WeCom sends in Workers and refuses redirects without following them', async () => {
  const bundle = await build({
    stdin: {
      contents: `
        import wecomService from './src/service/wecom-service.js';
        export default { async fetch() {
          try {
            await wecomService.test({env:{kv:{get:async()=>null}}}, {
              webhookUrl:'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=fake-runtime-key-1234567890'
            });
            return Response.json({ok:true});
          } catch(error) {
            return Response.json({ok:false, message:error.message});
          }
        }};
      `,
      resolveDir: path.resolve(__dirname, '../..'),
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    plugins: [{
      name: 'test-translations',
      setup(builder) {
        builder.onResolve({filter:/i18n\/i18n$/}, () => ({path:'translations', namespace:'test'}));
        builder.onLoad({filter:/.*/, namespace:'test'}, () => ({
          contents: 'export const t = key => key;',
        }));
      },
    }],
  });
  const calls = [];
  let redirect = false;
  const mf = new Miniflare({
    modules: true,
    compatibilityDate: '2025-06-04',
    script: bundle.outputFiles[0].text,
    outboundService: async request => {
      calls.push({url:request.url, body:await request.json()});
      return redirect
        ? new Response(null, {status:302, headers:{location:'https://unexpected.example/redirect'}})
        : Response.json({errcode:0});
    },
  });
  try {
    assert.deepEqual(await (await mf.dispatchFetch('http://local.test/')).json(), {ok:true});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.msgtype, 'text');
    assert.match(calls[0].body.text.content, /Xi-Mail/);
    redirect = true;
    const failed = await (await mf.dispatchFetch('http://local.test/')).json();
    assert.equal(failed.ok, false);
    assert.equal(failed.message, 'wecomSendFailedDetails');
    assert.equal(calls.length, 2, 'a redirect must not cause another outbound request');
    assert.ok(calls.every(call => new URL(call.url).hostname === 'qyapi.weixin.qq.com'));
  } finally {
    await mf.dispose();
  }
});
