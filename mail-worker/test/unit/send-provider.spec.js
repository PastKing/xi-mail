import { afterEach, describe, expect, it, vi } from 'vitest';
import emailService from '../../src/service/email-service';
import queenSmtpService from '../../src/service/queen-smtp-service';

const setting = (resendTokens = {}, queenTokens = {}, sendProviders = {}) => ({ resendTokens, queenTokens, sendProviders });

describe('resolveSendProvider', () => {
	it('只配置 Resend 时保持原行为', () => {
		expect(emailService.resolveSendProvider(setting({ 'a.com': 're_1' }), 'a.com', false)).toEqual({ type: 'resend', token: 're_1' });
	});

	it('只配置 QueenSMTP 时使用 QueenSMTP', () => {
		expect(emailService.resolveSendProvider(setting({}, { 'a.com': 'qs_1' }), 'a.com', false)).toEqual({ type: 'queensmtp', token: 'qs_1' });
	});

	it('两个都配置时默认 Resend，指定后用 QueenSMTP', () => {
		const both = { 'a.com': 're_1' };
		const queen = { 'a.com': 'qs_1' };
		expect(emailService.resolveSendProvider(setting(both, queen), 'a.com', false).type).toBe('resend');
		expect(emailService.resolveSendProvider(setting(both, queen, { 'a.com': 'queensmtp' }), 'a.com', false).type).toBe('queensmtp');
	});

	it('指定的服务没有 Token 时回退到另一个', () => {
		expect(emailService.resolveSendProvider(setting({ 'a.com': 're_1' }, {}, { 'a.com': 'queensmtp' }), 'a.com', false).type).toBe('resend');
	});

	it('有附件时 QueenSMTP 改用 Resend，没有 Resend 则报错', () => {
		const prefer = { 'a.com': 'queensmtp' };
		expect(emailService.resolveSendProvider(setting({ 'a.com': 're_1' }, { 'a.com': 'qs_1' }, prefer), 'a.com', true).type).toBe('resend');
		expect(() => emailService.resolveSendProvider(setting({}, { 'a.com': 'qs_1' }), 'a.com', true)).toThrow();
	});

	it('其他域名的 Token 不会被使用', () => {
		expect(emailService.resolveSendProvider(setting({ 'b.com': 're_1' }, { 'b.com': 'qs_1' }), 'a.com', false)).toBeNull();
	});
});

describe('queenSmtpService.send', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('多个收件人逐个发送，并带上回复头', async () => {
		const bodies = [];
		vi.stubGlobal('fetch', vi.fn(async (url, init) => {
			bodies.push(JSON.parse(init.body));
			return { json: async () => ({ success: true, data: { id: 'id' + bodies.length } }) };
		}));

		const result = await queenSmtpService.send('qs_1', {
			from: 'me@a.com', fromName: 'Me', to: ['x@b.com', 'y@b.com'],
			subject: 'Hi', html: '<p>hi</p>', text: 'hi', inReplyTo: '<m1@b.com>',
		});

		expect(result).toEqual({ ids: ['id1', 'id2'], failed: [] });
		expect(bodies.map(b => b.to)).toEqual(['x@b.com', 'y@b.com']);
		expect(bodies[0]).toMatchObject({ from: 'me@a.com', fromName: 'Me', isBulk: false, headers: { 'In-Reply-To': '<m1@b.com>' } });
	});

	it('全部失败时抛出 QueenSMTP 的错误信息', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({
			json: async () => ({ success: false, error: 'The From domain is not verified', code: 'domain_not_verified' }),
		})));

		await expect(queenSmtpService.send('qs_1', { from: 'me@a.com', to: ['x@b.com'], subject: 'Hi', text: 'hi' }))
			.rejects.toThrow(/domain_not_verified/);
	});

	it('部分失败时返回失败列表', async () => {
		let n = 0;
		vi.stubGlobal('fetch', vi.fn(async () => ({
			json: async () => (++n === 1
				? { success: true, data: { id: 'ok' } }
				: { success: false, error: 'blocked', code: 'recipient_blocked' }),
		})));

		const result = await queenSmtpService.send('qs_1', { from: 'me@a.com', to: ['x@b.com', 'y@b.com'], subject: 'Hi', text: 'hi' });
		expect(result.ids).toEqual(['ok']);
		expect(result.failed[0]).toMatchObject({ to: 'y@b.com', code: 'recipient_blocked' });
	});
});
