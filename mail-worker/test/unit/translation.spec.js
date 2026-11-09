import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import translation from '../../src/service/translation-service';
import provider from '../../src/service/translation-provider';
import emailService from '../../src/service/email-service';
import rate from '../../src/service/security-rate-limit-service';
import worker from '../../src/index';
import BizError from '../../src/error/biz-error';
import catalog from '../../src/service/language-catalog-service';
import {TRANSLATION_LANGUAGES} from '../../src/const/translation-languages';
import settingService from '../../src/service/setting-service';

let c,values,remote;
beforeEach(()=>{
  values=new Map();
  c={env:{kv:{get:async key=>values.has(key)?JSON.parse(values.get(key)):null,put:async(key,value)=>values.set(key,value)},db:{}},get:key=>key==='user'?{userId:10}:undefined};
  vi.spyOn(rate,'consume').mockResolvedValue(undefined);
  remote=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Unexpected network request'));
});
afterEach(()=>vi.restoreAllMocks());

describe('Managed interface languages',()=>{
  it('defaults to Chinese without auto-translating any page or private data',async()=>{
    expect(await translation.config(c)).toEqual({languages:['zh'],mailTranslation:true});
    expect((await translation.publicConfig(c)).languages.map(item=>item.id)).toEqual(['zh']);
    expect(remote).not.toHaveBeenCalled();
  });
  it('only publishes enabled, generated languages and always retains Chinese',async()=>{
    await expect(translation.save(c,{languages:['en'],mailTranslation:true})).rejects.toMatchObject({code:400});
    await c.env.kv.put('translation:pack:en',JSON.stringify({messages:{inbox:'Inbox'}}));
    expect((await translation.save(c,{languages:['en','en'],mailTranslation:false})).languages).toEqual(['zh','en']);
    expect((await translation.pack(c,'en')).messages.inbox).toBe('Inbox');
    await expect(translation.pack(c,'ja')).rejects.toMatchObject({code:404});
    await expect(translation.save(c,{languages:['__proto__'],mailTranslation:true})).rejects.toMatchObject({code:400});
  });
  it('generates only source labels, restores interpolation variables and reuses unchanged labels',async()=>{
    const translate=vi.spyOn(provider,'translate').mockImplementation(async texts=>texts.map(text=>'Translated '+text));
    await translation.generate(c,'en');
    const pack=await c.env.kv.get('translation:pack:en');
    expect(Object.values(pack.messages).some(text=>text.includes('XIMAILVAR'))).toBe(false);
    expect(pack.messages.totalUserAccount).toContain('{msg}');
    expect(JSON.stringify(translate.mock.calls)).not.toContain('private-message@example.test');
    await translation.generate(c,'en');
    expect(translate.mock.calls[1][0]).toEqual([]);
    expect(remote).not.toHaveBeenCalled();
  });
  it('keeps an existing pack intact when placeholder translation fails',async()=>{
    await c.env.kv.put('translation:pack:en',JSON.stringify({messages:{inbox:'Old Inbox'}}));
    vi.spyOn(provider,'translate').mockImplementation(async texts=>texts.map(()=> 'Lost all placeholders'));
    await expect(translation.generate(c,'en')).rejects.toMatchObject({code:503});
    expect((await c.env.kv.get('translation:pack:en')).messages).toEqual({inbox:'Old Inbox'});
  });
  it('limits repeated generation per user and language while allowing a multi-language update',async()=>{
    vi.spyOn(provider,'translate').mockImplementation(async texts=>texts.map(text=>'Translated '+text));
    const languages=TRANSLATION_LANGUAGES.filter(item=>item.id!=='zh').slice(0,10);
    for(const language of languages)await translation.generate(c,language.id);
    expect(rate.consume.mock.calls.filter(call=>call[1]==='translation-generate').map(call=>call.slice(2))).toEqual(languages.map(item=>[`10:${item.id}`,8,300]));
    await translation.generate(c,languages[0].id);
    expect(rate.consume).toHaveBeenLastCalledWith(c,'translation-generate',`10:${languages[0].id}`,8,300);
  });
  it('does not expose translation management or arbitrary translation to anonymous clients',async()=>{
    for(const [path,method]of [['/translation/config','GET'],['/translation/generate','POST'],['/translation/save','POST'],['/translation/register','POST'],['/translation/catalog/refresh','POST'],['/translation/targets','GET'],['/email/translate','POST']]){
      const response=await worker.fetch(new Request('https://local.test/api'+path,{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})}),c.env,{});
      expect((await response.json()).code).toBe(401);
    }
    const result=await worker.fetch(new Request('https://local.test/api/translation/pack?language=zh'),c.env,{});
    expect((await result.json()).code).toBe(200);
    expect(remote).not.toHaveBeenCalled();
  });
});

describe('Independent mail translation',()=>{
  it('checks read ownership before contacting a translator',async()=>{
    vi.spyOn(emailService,'content').mockRejectedValue(new BizError('Not found',404));
    await expect(translation.mail(c,{emailId:25,target:'zh'},10)).rejects.toMatchObject({code:404});
    expect(remote).not.toHaveBeenCalled();
  });
  it('translates stored plain text only on request and never stores mail in language packs',async()=>{
    const read=vi.spyOn(emailService,'content').mockResolvedValue({emailId:25,text:'Original mail body',content:'<script>bad()</script>'});
    const translate=vi.spyOn(provider,'translate').mockResolvedValue(['Translated mail body']);
    const result=await translation.mail(c,{emailId:25,target:'zh',text:'Forged client content'},10);
    expect(read).toHaveBeenCalledWith(c,{emailId:25},10);
    expect(translate).toHaveBeenCalledWith(['Original mail body'],'zh-Hans');
    expect(result).toEqual({emailId:25,target:'zh',text:'Translated mail body'});
    expect(values.size).toBe(0);
  });
  it('removes scripts and styles from HTML-only mail before translation',async()=>{
    vi.spyOn(emailService,'content').mockResolvedValue({emailId:25,content:'<p>Hello world</p><script>secretScript()</script><style>.private{color:red}</style>',text:''});
    const translate=vi.spyOn(provider,'translate').mockImplementation(async texts=>texts);
    await translation.mail(c,{emailId:25,target:'zh'},10);
    expect(JSON.stringify(translate.mock.calls)).toContain('Hello world');
    expect(JSON.stringify(translate.mock.calls)).not.toMatch(/secretScript|color:red/);
  });
  it('respects the mail translation switch, valid targets and size limit',async()=>{
    const read=vi.spyOn(emailService,'content').mockResolvedValue({emailId:25,text:'a'.repeat(40001)});
    await expect(translation.mail(c,{emailId:25,target:'zh'},10)).rejects.toMatchObject({code:400});
    await expect(translation.mail(c,{emailId:25,target:'not-a-language'},10)).rejects.toMatchObject({code:400});
    await c.env.kv.put('translation:config',JSON.stringify({languages:['zh'],mailTranslation:false}));
    read.mockClear();
    await expect(translation.mail(c,{emailId:25,target:'zh'},10)).rejects.toMatchObject({code:403});
    expect(read).not.toHaveBeenCalled();expect(remote).not.toHaveBeenCalled();
  });
  it('only permits mail translation into enabled languages',async()=>{
    const read=vi.spyOn(emailService,'content').mockResolvedValue({emailId:25,text:'Hello'});
    const translate=vi.spyOn(provider,'translate').mockResolvedValue(['Bonjour']);
    expect((await translation.config(c)).languages).toEqual(['zh']);
    await expect(translation.mail(c,{emailId:25,target:'fr'},10)).rejects.toMatchObject({code:403});
    expect(read).not.toHaveBeenCalled();expect(translate).not.toHaveBeenCalled();
    await c.env.kv.put('translation:config',JSON.stringify({languages:['zh','fr'],mailTranslation:true}));
    expect((await translation.publicConfig(c)).languages.map(item=>item.id)).toEqual(['zh','fr']);
    expect(await translation.mail(c,{emailId:25,target:'fr'},10)).toEqual({emailId:25,target:'fr',text:'Bonjour'});
    expect(translate).toHaveBeenCalledWith(['Hello'],'fr');
  });
  it('preserves mail structure, CSS, links and code while escaping translated markup as text',async()=>{
    vi.spyOn(emailService,'content').mockResolvedValue({emailId:25,content:'<html><head><style>h1{color:red}</style></head><body><h1>Welcome</h1><p>Use <a href="https://example.test/login?token=original">this link</a></p><pre>do not translate</pre><code>123456</code><script>bad()</script></body></html>'});
    const translate=vi.spyOn(provider,'translate').mockImplementation(async texts=>texts.map(text=>text==='Welcome'?'<img src=x onerror=bad()>':'Translated '+text));
    const result=await translation.mail(c,{emailId:25,target:'zh'},10);
    expect(result.html).toContain('<style>h1{color:red}</style>');
    expect(result.html).toContain('href="https://example.test/login?token=original"');
    expect(result.html).toContain('<pre>do not translate</pre>');expect(result.html).toContain('<code>123456</code>');
    expect(result.html).toContain('&lt;img');expect(result.html).not.toContain('<img src=x');expect(result.html).not.toContain('<script');
    expect(JSON.stringify(translate.mock.calls)).not.toMatch(/do not translate|123456|token=original|color:red/);
  });
  it('retains an image-only mail without contacting the translator',async()=>{
    vi.spyOn(emailService,'content').mockResolvedValue({emailId:25,content:'<img src="https://example.test/image.png">'});
    const translate=vi.spyOn(provider,'translate');const result=await translation.mail(c,{emailId:25,target:'zh'},10);
    expect(result.html).toContain('https://example.test/image.png');expect(translate).not.toHaveBeenCalled();
  });
});

describe('Single-source public registration hint',()=>{
  async function prepare(hint='联系管理员获取注册码'){
    await c.env.kv.put('setting:',JSON.stringify({regKeyHint:hint,regKeyHintEn:'Legacy English hint',secretKey:'not-public'}));
    await c.env.kv.put('translation:config',JSON.stringify({languages:['zh','en'],mailTranslation:true}));
    await c.env.kv.put('translation:pack:en',JSON.stringify({messages:{inbox:'Inbox'},version:'fixture'}));
  }
  it('translates only the public hint, caches it and never uses the legacy English setting',async()=>{
    await prepare();
    const translate=vi.spyOn(provider,'translate').mockResolvedValue(['Contact the administrator for a code']);
    const first=await translation.pack(c,'en'),second=await translation.pack(c,'en');
    expect(first.publicCopy).toEqual({regKeyHintSource:'联系管理员获取注册码',regKeyHint:'Contact the administrator for a code'});
    expect(second.publicCopy).toEqual(first.publicCopy);expect(translate).toHaveBeenCalledOnce();
    expect(translate).toHaveBeenCalledWith(['联系管理员获取注册码'],'en');
    expect(JSON.stringify(first)).not.toMatch(/Legacy English hint|not-public/);
  });
  it('keeps the interface pack usable and falls back to source copy if translation is unavailable',async()=>{
    await prepare();vi.spyOn(provider,'translate').mockRejectedValue(new BizError('Unavailable',503));
    const pack=await translation.pack(c,'en');
    expect(pack.messages.inbox).toBe('Inbox');expect(pack.publicCopy.regKeyHint).toBe('联系管理员获取注册码');
    expect([...values.keys()].filter(key=>key.startsWith('translation:registration-copy:'))).toHaveLength(0);
  });
  it('uses the current source text after an administrator edits the hint',async()=>{
    await prepare();const translate=vi.spyOn(provider,'translate').mockImplementation(async texts=>texts.map(text=>'Translated '+text));
    await translation.pack(c,'en');await prepare('前往帮助页面获取注册码');
    const pack=await translation.pack(c,'en');expect(pack.publicCopy.regKeyHintSource).toBe('前往帮助页面获取注册码');expect(translate).toHaveBeenCalledTimes(2);
  });
  it('omits the deprecated English field from the public website configuration',async()=>{
    vi.spyOn(settingService,'get').mockResolvedValue({regKeyHint:'中文提示',regKeyHintEn:'Legacy English hint',domainList:[],loginDomain:0});
    const config=await settingService.websiteConfig(c);
    expect(config.regKeyHint).toBe('中文提示');expect(config).not.toHaveProperty('regKeyHintEn');
  });
});

describe('Complete and custom language catalog',()=>{
  it('bundles the full provider directory and preserves established language IDs',async()=>{
    expect(TRANSLATION_LANGUAGES.length).toBeGreaterThan(100);
    expect((await catalog.resolve(c,'zh-Hans')).id).toBe('zh');
    expect((await catalog.resolve(c,'fr-CA')).serviceId).toBe('fr-CA');
    for(const item of TRANSLATION_LANGUAGES)expect((await catalog.resolve(c,item.id)).id).toBe(item.id);
  });
  it('retains provider-specific codes without adding duplicate canonical aliases during refresh',async()=>{
    remote.mockResolvedValue(Response.json({translation:Object.fromEntries(TRANSLATION_LANGUAGES.map(item=>[item.serviceId,{nativeName:item.name,name:item.label}]))}));
    const refreshed=await catalog.refresh(c);
    expect(refreshed).toHaveLength(TRANSLATION_LANGUAGES.length);
    expect(refreshed.find(item=>item.id==='prs').serviceId).toBe('prs');
    expect(refreshed.some(item=>item.id==='fa-AF')).toBe(false);
  });
  it('refreshes metadata only from the fixed language resource and retains the fallback directory',async()=>{
    remote.mockResolvedValue(Response.json({translation:{'fr-CA':{nativeName:'Français canadien',name:'加拿大法语'},'xy-ZZ':{nativeName:'Future locale',name:'Future language'}}}));
    const list=await catalog.refresh(c);
    expect(remote.mock.calls[0][0]).toBe('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation');
    expect(list.length).toBeGreaterThan(100);expect(list.some(item=>item.id==='xy-ZZ')).toBe(true);
  });
  it('accepts custom codes only after actual provider validation and persists their metadata',async()=>{
    const translate=vi.spyOn(provider,'translate').mockResolvedValue(['Validated']);
    const result=await catalog.register(c,{code:'xy-ZZ',name:'Synthetic future locale'});
    expect(result.id).toBe('xy-ZZ');expect(translate).toHaveBeenCalledWith(['语言'],'xy-ZZ','zh-Hans');
    expect((await catalog.resolve(c,'xy-ZZ')).name).toBe('Synthetic future locale');
    await c.env.kv.put('translation:pack:xy-ZZ',JSON.stringify({messages:{inbox:'Future inbox'}}));
    await translation.save(c,{languages:['xy-ZZ'],mailTranslation:true});
    expect((await translation.publicConfig(c)).languages.some(item=>item.id==='xy-ZZ')).toBe(true);
  });
  it('does not register rejected or malformed codes and does not accept URLs',async()=>{
    vi.spyOn(provider,'translate').mockRejectedValue(new BizError('Unavailable',503));
    await expect(catalog.register(c,{code:'xy-ZZ',name:'Unsupported'})).rejects.toMatchObject({code:400});
    await expect(catalog.register(c,{code:'https://other.example/'})).rejects.toMatchObject({code:400});
    expect(values.has('translation:custom-languages')).toBe(false);expect(remote).not.toHaveBeenCalled();
  });
});

describe('Edge translation channel',()=>{
  it('uses a fixed endpoint, bounded text batches and manual redirects',async()=>{
    remote.mockResolvedValue(Response.json([{translations:[{text:'Inbox'}]}]));
    expect(await provider.translate(['source'],'en','zh-Hans')).toEqual(['Inbox']);
    const [url,options]=remote.mock.calls[0];
    expect(url.origin).toBe('https://edge.microsoft.com');
    expect(url.searchParams.get('to')).toBe('en');expect(options.redirect).toBe('manual');
    expect(JSON.parse(options.body)).toEqual(['source']);
    expect(options.headers.Authorization).toBeUndefined();
    expect(options.headers['User-Agent']).toMatch(/Edg\/\d+\./);
  });
  it('omits the from parameter for automatic mail source detection',async()=>{
    remote.mockResolvedValue(Response.json([{detectedLanguage:{language:'en'},translations:[{text:'Translated mail'}]}]));
    expect(await provider.translate(['Hello'],'zh-Hans')).toEqual(['Translated mail']);
    expect(remote.mock.calls[0][0].searchParams.has('from')).toBe(false);
  });
  it.each([new Response('unavailable',{status:503}),Response.json([]),new Response('not json')])('does not use incomplete or failed output',async response=>{
    remote.mockResolvedValue(response);
    await expect(provider.translate(['source'],'en')).rejects.toMatchObject({code:503});
  });
});
