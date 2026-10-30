import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
	settings: {}, rows: [], row: null, saved: false,
}));
vi.mock('../../src/service/setting-service', () => ({ default: { query: async () => state.settings } }));
vi.mock('../../src/service/account-service', () => ({ default: { selectByEmailIncludeDel: async () => ({ userId: 1, accountId: 1 }) } }));
vi.mock('../../src/service/user-service', () => ({ default: { selectByIdIncludeDel: async () => ({ email: 'owner@example.net' }) } }));
vi.mock('../../src/service/role-service', () => ({ default: {} }));
vi.mock('../../src/service/email-service', () => ({ default: {
	receive: vi.fn(async (c, params) => { state.row = { ...params, emailId: 1 }; return state.row; }),
	completeReceive: vi.fn(async () => { state.saved = true; return state.row; }),
} }));
vi.mock('../../src/service/att-service', () => ({ default: { addAtt: vi.fn() } }));
vi.mock('../../src/service/telegram-service', () => ({ default: { sendEmailToBot: vi.fn() } }));
vi.mock('../../src/service/ai-service', () => ({ default: { extractCode: async () => '' } }));
vi.mock('../../src/i18n/i18n', () => ({ t: key => key }));
import { email } from '../../src/email/email';
import wecomService from '../../src/service/wecom-service';
import { settingConst } from '../../src/const/entity-const';

let env;
beforeEach(() => {
	state.saved = false; state.row = null;
	state.settings = { receive: 0, ruleType: 0, forwardStatus: 0, forwardEmail: 'archive@example.net' };
	env = { admin: 'owner@example.net', kv: { get: async () => ({ enabled: true,
		webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=fake-key' }) } };
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function receiveMail() {
	const raw = new TextEncoder().encode('From: =?UTF-8?B?5rWL6K+V?= <sender@example.net>\r\nTo: inbox@example.net\r\nSubject: =?UTF-8?B?5rWL6K+V?=\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n你好，世界😀');
	// One byte per chunk verifies that MIME decoding does not corrupt split UTF-8 characters.
	const message = { from: 'sender@example.net', to: 'inbox@example.net',
		raw: new ReadableStream({ start(controller) {
			for (const byte of raw) controller.enqueue(Uint8Array.of(byte));
			controller.close();
		} }), setReject: vi.fn(), forward: vi.fn(async () => {}) };
	const pending = [];
	await email(message, env, { waitUntil: promise => pending.push(promise) });
	await Promise.all(pending);
	return { message, pending };
}

it('notifies only after saving, decodes MIME once, and keeps forwarding when the robot fails', async () => {
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});
	const fetchMock = vi.fn(async () => {
		expect(state.saved).toBe(true);
		throw new Error('network error with secret');
	});
	vi.stubGlobal('fetch', fetchMock);
	const { message, pending } = await receiveMail();
	expect(state.row.subject).toBe('测试');
	expect(state.row.text).toContain('你好，世界😀');
	expect(pending).toHaveLength(1);
	expect(fetchMock).toHaveBeenCalledOnce();
	expect(message.forward).toHaveBeenCalledWith('archive@example.net');
	expect(message.setReject).not.toHaveBeenCalled();
	expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
});

it('applies shared recipient rules and never notifies rejected mail', async () => {
	const notify = vi.spyOn(wecomService, 'sendEmail').mockResolvedValue();
	state.settings.ruleType = settingConst.ruleType.RULE;
	state.settings.ruleEmail = 'another@example.net';
	let result = await receiveMail();
	expect(notify).not.toHaveBeenCalled();
	expect(result.message.forward).not.toHaveBeenCalled();
	state.settings.ruleEmail = 'inbox@example.net';
	await receiveMail();
	expect(notify).toHaveBeenCalledOnce();
	notify.mockClear();
	state.settings.receive = settingConst.receive.CLOSE;
	result = await receiveMail();
	expect(result.message.setReject).toHaveBeenCalled();
	expect(notify).not.toHaveBeenCalled();
});
