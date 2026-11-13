import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { safeObjectHeaders, safeObjectMetadata, attachmentDisposition, OBJECT_CSP } from '../../src/utils/object-policy';
import r2Service from '../../src/service/r2-service';
import kvObjService from '../../src/service/kv-obj-service';
import s3Service from '../../src/service/s3-service';
import worker from '../../src/index';
import locations from '../../src/service/object-location-service';
import settingService from '../../src/service/setting-service';
import {isObjectKey} from '../../src/utils/object-key-policy';

const encoder = new TextEncoder();
const svg = encoder.encode('<svg xmlns="http://www.w3.org/2000/svg"><script>parent.__objectProbe=localStorage.token</script></svg>');
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3l8AAAAASUVORK5CYII=', 'base64'));
const oldSvgMetadata = { contentType: 'image/svg+xml', contentDisposition: 'inline;filename=probe.svg', cacheControl: 'public,max-age=31536000,immutable' };
afterEach(() => vi.restoreAllMocks());

describe('Untrusted object response policy', () => {
  it.each(['setting:','global:token','public_key:','auth-uid:1','mail-link:v1:test','attachments/../setting:','attachments/%2e%2e/setting%3a','static/background/../../setting:'])('rejects non-object key %s before any storage lookup',async key=>{
    const lookup=vi.fn();expect(isObjectKey(key)).toBe(false);
    expect(await r2Service.getObj({env:{kv:{getWithMetadata:lookup},db:{prepare:lookup}}},key)).toBe(null);
    expect(await kvObjService.getObj({env:{kv:{getWithMetadata:lookup}}},key)).toBe(null);expect(lookup).not.toHaveBeenCalled();
  });
  it.each(['image/svg+xml', 'image/svg+xml; charset=utf-8', 'IMAGE/SVG+XML', 'text/html', 'application/xhtml+xml', 'application/xml', 'text/xml', 'text/javascript', 'application/pdf', '', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/png\r\nX-Injected: yes'])('downloads active or spoofed content declared as %s', type => {
    const headers = safeObjectHeaders(svg, 'attachments/probe.svg', { ...oldSvgMetadata, contentType: type });
    expect(headers['Content-Type']).toBe('application/octet-stream');
    expect(headers['Content-Disposition']).toMatch(/^attachment;/);
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['Content-Security-Policy']).toBe(OBJECT_CSP);
    expect(headers['Content-Security-Policy']).toMatch(/^sandbox;/);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
  });
  it.each([
    ['image/png', png], ['image/jpeg', [255, 216, 255, 224]],
    ['image/gif', encoder.encode('GIF89a')], ['image/webp', encoder.encode('RIFF1234WEBP')],
    ['image/bmp', [66, 77, 0, 0]], ['image/x-icon', [0, 0, 1, 0]],
    ['image/avif', [0, 0, 0, 24, ...encoder.encode('ftypavif')]],
  ])('preserves validated %s inline images', (type, content) => {
    const policy = safeObjectMetadata(Uint8Array.from(content), 'attachments/image', { contentType: type, contentDisposition: 'inline;filename=image' });
    expect(policy.contentType).toBe(type);
    expect(policy.contentDisposition).toMatch(/^inline;/);
    expect(policy.cacheControl).toBe('public, max-age=86400');
  });
  it('keeps normal downloadable image attachments as downloads and preserves Unicode filenames', () => {
    const metadata = { contentType: 'image/png', contentDisposition: attachmentDisposition('账单 "图片";2026.png') };
    const policy = safeObjectMetadata(png, 'attachments/image.png', metadata);
    expect(policy.contentDisposition).toBe(metadata.contentDisposition);
    expect(policy.contentDisposition).toMatch(/^attachment;/);
    expect(policy.contentDisposition).toContain("filename*=UTF-8''%E8%B4%A6%E5%8D%95");
  });
  it('validates a typed-array view without reading unrelated prefix/suffix bytes', () => {
    const backing = new Uint8Array(png.length + 5); backing.set(png, 3);
    const view = new DataView(backing.buffer, 3, png.length);
    expect(safeObjectMetadata(view, 'attachments/image.png', { contentType: 'image/png' }).contentType).toBe('image/png');
  });
  it('rejects a raster signature that disagrees with its declared type', () => {
    expect(safeObjectMetadata(png, 'attachments/fake.svg', oldSvgMetadata).contentType).toBe('application/octet-stream');
  });
  it.each(['inline;filename=evil.svg\r\nX-Injected: yes', 'inline;filename="a\\\"; injected=true.svg"', "inline;filename*=UTF-8''%0d%0aX-Injected%3A%20yes", 'inline;filename="broken.svg'])('regenerates legacy filename headers safely: %s', disposition => {
    const headers = safeObjectHeaders(svg, 'attachments/fallback.svg', { ...oldSvgMetadata, contentDisposition: disposition });
    const response = new Response(svg, { headers });
    expect(response.headers.get('x-injected')).toBeNull();
    expect(response.headers.get('content-disposition')).not.toMatch(/[\r\n]/);
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="[^"\\]*"; filename\*=UTF-8''/);
  });
  it('does not throw on malformed surrogate characters in sender filenames', () => {
    expect(attachmentDisposition('\ud800.svg')).toContain('%EF%BF%BD.svg');
  });
});

describe('Stored object entry points', () => {
  beforeEach(()=>{
    vi.spyOn(locations,'list').mockResolvedValue([]);
    vi.spyOn(locations,'record').mockResolvedValue(undefined);
    vi.spyOn(settingService,'query').mockResolvedValue({bucket:'test-bucket',endpoint:'https://s3.example.test',s3AccessKey:'test-key',s3SecretKey:'test-secret'});
  });
  it.each(['R2', 'KV', 'S3'])('stores safe metadata for anonymous uploads using %s', async storage => {
    vi.spyOn(r2Service, 'storageType').mockResolvedValue(storage);
    const put = vi.fn().mockResolvedValue(undefined);
    if (storage === 'KV') vi.spyOn(kvObjService, 'putObj').mockImplementation(put);
    if (storage === 'S3') vi.spyOn(s3Service, 'putObj').mockImplementation(put);
    const c = { env: { r2: { put } } };
    await r2Service.putObj(c, 'attachments/probe.svg', svg, oldSvgMetadata);
    const metadata = storage === 'R2' ? put.mock.calls[0][2].httpMetadata : put.mock.calls[0][3];
    expect(metadata.contentType).toBe('application/octet-stream');
    expect(metadata.contentDisposition).toMatch(/^attachment;/);
    expect(metadata.cacheControl).toBe('no-store');
  });
  it('denies anonymous reads of historical private objects before storage lookup',async()=>{
    const get=vi.fn();
    const response=await worker.fetch(new Request('https://mail.example/attachments/probe.svg'),{r2:{get}},{});
    expect(response.status).toBe(401);expect(get).not.toHaveBeenCalled();
  });
  it.each(['/static/probe.svg'])('protects historical public website assets through the Worker path %s', async path => {
    vi.spyOn(r2Service, 'storageType').mockResolvedValue('R2');
    const get = vi.fn().mockResolvedValue({ httpMetadata: oldSvgMetadata, arrayBuffer: async () => svg.buffer });
    const response = await worker.fetch(new Request('https://mail.example' + path), { r2: { get } }, {});
    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith(path.slice(1));
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment;/);
    expect(response.headers.get('content-security-policy')).toBe(OBJECT_CSP);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(svg);
  });
  it.each(['KV', 'S3'])('protects legacy %s objects on reads, including the shared /oss responder', async storage => {
    vi.spyOn(r2Service, 'storageType').mockResolvedValue(storage);
    vi.spyOn(storage === 'KV' ? kvObjService : s3Service, 'getObj').mockResolvedValue({ buff: svg, ...oldSvgMetadata });
    const response = await r2Service.toObjResp({ env: {kv:{}} }, 'attachments/legacy.svg');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment;/);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('retains existing inline PNG images and handles missing objects', async () => {
    const get = vi.spyOn(r2Service, 'getObj').mockResolvedValue({ buff: png, contentType: 'image/png', contentDisposition: 'inline;filename=cid.png' });
    const image = await r2Service.toObjResp({}, 'attachments/cid.png');
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(image.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(png);
    get.mockResolvedValueOnce(null);
    expect((await r2Service.toObjResp({}, 'attachments/missing')).status).toBe(404);
  });
});
