import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/i18n/i18n', () => ({ t: key => key }));
import wecomService, { buildMessages } from '../../src/service/wecom-service';

const url = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=fake-test-key';
const mail = { name: '测试发件人', sendEmail: 'sender@example.net', toEmail: 'inbox@example.net',
	subject: '测试主题', createTime: '2026-10-30 08:00:00', text: '你好，世界！📬' };
let c, saved, fetchMock;
beforeEach(() => {
	saved = null;
	c = { env: { kv: {
		get: vi.fn(async () => saved),
		put: vi.fn(async (key, value) => { saved = JSON.parse(value); }),
	} } };
	fetchMock = vi.fn(async () => Response.json({ errcode: 0 }));
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('defaults off, hides the secret, preserves it when toggling, and requires a URL to enable', async () => {
	expect(await wecomService.get(c)).toEqual({ enabled: false, hasWebhook: false });
	await expect(wecomService.set(c, { enabled: true })).rejects.toThrow('wecomWebhookRequired');
	expect(c.env.kv.put).not.toHaveBeenCalled();
	await wecomService.set(c, { enabled: true, webhookUrl: ` ${url} ` });
	expect(await wecomService.get(c)).toEqual({ enabled: true, hasWebhook: true });
	await wecomService.set(c, { enabled: false, webhookUrl: '' });
	expect(saved).toEqual({ enabled: false, webhookUrl: url });
	await wecomService.sendEmail(c, mail);
	expect(fetchMock).not.toHaveBeenCalled();
});

it('rejects untrusted URLs and malformed values before writing or fetching', async () => {
	for (const webhookUrl of [
		'http://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc',
		'https://evil.example/cgi-bin/webhook/send?key=abc',
		'https://qyapi.weixin.qq.com.evil.example/cgi-bin/webhook/send?key=abc',
		'https://user:pass@qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc',
		'https://qyapi.weixin.qq.com:8443/cgi-bin/webhook/send?key=abc',
		'https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=abc',
		`${url}&key=other`, `${url}&redirect=anything`, `${url}#fragment`,
		'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=', 123, {},
	]) {
		await expect(wecomService.set(c, { enabled: true, webhookUrl })).rejects.toThrow('wecomInvalidWebhook');
		await expect(wecomService.test(c, { webhookUrl })).rejects.toThrow('wecomInvalidWebhook');
	}
	await expect(wecomService.set(c, { enabled: 'true', webhookUrl: url })).rejects.toThrow();
	expect(c.env.kv.put).not.toHaveBeenCalled();
	expect(fetchMock).not.toHaveBeenCalled();
});

it('uses plain text first, handles HTML-only or empty mail, and keeps UTF-8 chunks complete and within budget', () => {
	expect(buildMessages({ ...mail, content: '<p>ignore this HTML</p>' })[0]).toContain(mail.text);
	const html = buildMessages({ ...mail, text: '', content: '<style>secret</style><p>你好 &amp; 世界</p><a href="https://example.net/confirm"><script>hidden()</script>确认链接</a><img alt="测试图片"><script>hidden()</script>' }).join('');
	expect(html).toContain('你好 & 世界');
	expect(html).toContain('确认链接（https://example.net/confirm）');
	expect(html).toContain('[图片：测试图片]');
	expect(html).not.toMatch(/secret|hidden\(\)|<p>/);
	expect(buildMessages({})[0]).toContain('邮件正文为空');
	const body = '中文😀\n'.repeat(4000);
	const messages = buildMessages({ ...mail, subject: '长主题😀'.repeat(2000), text: body });
	expect(messages.length).toBeGreaterThan(2);
	for (const message of messages) {
		expect(new TextEncoder().encode(message).length).toBeLessThanOrEqual(1900);
		expect(message).not.toContain('\uFFFD');
		expect(message).toContain('收件人｜inbox@example.net');
	}
	expect(messages.map(message => message.split('邮件正文\n\n')[1]).join('')).toBe(body.trim());
});

it('tests draft or saved URLs without saving or enabling, and sends mail segments in order', async () => {
	await wecomService.test(c, { webhookUrl: url });
	expect(c.env.kv.put).not.toHaveBeenCalled();
	expect(JSON.parse(fetchMock.mock.calls[0][1].body).text.content).toContain('测试通知');
	saved = { enabled: true, webhookUrl: url };
	fetchMock.mockClear();
	const longMail = { ...mail, text: '正文😀'.repeat(1000) };
	await wecomService.sendEmail(c, longMail);
	expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).text.content)).toEqual(buildMessages(longMail));
	for (const [target, options] of fetchMock.mock.calls) {
		expect(target).toBe(url);
		expect(options).toMatchObject({ method: 'POST', redirect: 'error' });
		expect(options.signal).toBeInstanceOf(AbortSignal);
	}
	saved.enabled = false;
	fetchMock.mockClear();
	await wecomService.test(c, {});
	expect(fetchMock).toHaveBeenCalledOnce();
	expect(saved.enabled).toBe(false);
});

it('fails on HTTP errors, API errors, invalid responses and network failures without exposing secrets', async () => {
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});
	for (const response of [
		() => new Response('{}', { status: 429 }),
		() => Response.json({ errcode: 93000, errmsg: url }),
		() => Response.json({}),
		() => new Response('not json'),
		() => { throw new Error(url); },
	]) {
		fetchMock.mockImplementation(response);
		await expect(wecomService.test(c, { webhookUrl: url })).rejects.toThrow('wecomSendFailed');
		saved = { enabled: true, webhookUrl: url };
		await expect(wecomService.sendEmail(c, mail)).resolves.toBeUndefined();
	}
	expect(JSON.stringify(log.mock.calls)).not.toContain('fake-test-key');
});
