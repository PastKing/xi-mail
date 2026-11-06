import { afterEach, describe, expect, it, vi } from 'vitest';
import accountService from '../../src/service/account-service';
import settingService from '../../src/service/setting-service';
import userService from '../../src/service/user-service';
import roleService from '../../src/service/role-service';

const c = { env: { admin: 'admin@a.com' } };

function mock({ user, role }) {
	vi.spyOn(settingService, 'query').mockResolvedValue({
		resendTokens: { 'a.com': 're_1' },
		queenTokens: { 'q.com': 'qs_1' },
		sendflareTokens: { 'sf.com': 'sf_1' },
		domainList: ['@a.com', '@q.com', '@sf.com'],
	});
	vi.spyOn(userService, 'selectById').mockResolvedValue(user);
	vi.spyOn(roleService, 'selectById').mockResolvedValue(role);
}

describe('accountService.sendableChecker', () => {
	afterEach(() => vi.restoreAllMocks());

	it('管理员：只要域名配置了 Resend 或 QueenSMTP 就能发', async () => {
		mock({ user: { email: 'admin@a.com', type: 0 } });
		const can = await accountService.sendableChecker(c, 1);
		expect(can('x@a.com')).toBe(true);
		expect(can('x@q.com')).toBe(true);
		expect(can('x@sf.com')).toBe(true);
		expect(can('x@none.com')).toBe(false);
	});

	it('普通用户：还要受等级可用域名限制', async () => {
		mock({ user: { email: 'u@a.com', type: 2 }, role: { sendType: 'count', availDomain: 'q.com' } });
		const can = await accountService.sendableChecker(c, 1);
		expect(can('x@q.com')).toBe(true);
		expect(can('x@a.com')).toBe(false);
	});

	it('等级为仅站内或禁止发件时全部不能对外发', async () => {
		mock({ user: { email: 'u@a.com', type: 2 }, role: { sendType: 'internal', availDomain: '' } });
		expect((await accountService.sendableChecker(c, 1))('x@a.com')).toBe(false);

		vi.restoreAllMocks();
		mock({ user: { email: 'u@a.com', type: 2 }, role: { sendType: 'ban', availDomain: '' } });
		expect((await accountService.sendableChecker(c, 1))('x@a.com')).toBe(false);
	});
});
