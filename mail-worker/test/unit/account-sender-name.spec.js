import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ saved: vi.fn(), run: vi.fn() }));
vi.mock('../../src/entity/orm', () => ({default: () => ({update: () => ({set: value => {
  state.saved(value);
  return {where: () => ({run: state.run})};
}})})}));
vi.mock('../../src/service/email-service', () => ({default: {}}));
vi.mock('../../src/service/user-service', () => ({default: {}}));
vi.mock('../../src/service/setting-service', () => ({default: {}}));
vi.mock('../../src/service/role-service', () => ({default: {}}));
vi.mock('../../src/i18n/i18n', () => ({t: key => key}));

import accountService from '../../src/service/account-service';

it('saves normalized names, restores the prefix on clearing, and rejects invalid or unowned accounts', async () => {
  const lookup = vi.spyOn(accountService, 'selectById').mockResolvedValue({userId: 1, email: 'support@example.com'});
  for (const [input, expected] of [[' 小鹅客服 ', '小鹅客服'], ['<Team>', 'Team'], ['', 'support'], ['   ', 'support']]) {
    expect(await accountService.setName({}, {accountId: 7, name: input}, 1)).toEqual({name: expected});
    expect(state.saved.mock.lastCall[0]).toEqual({name: expected});
  }
  state.saved.mockClear();
  for (const name of [null, {}, 'x'.repeat(31), '客服\r\nBcc: other@example.com']) {
    await expect(accountService.setName({}, {accountId: 7, name}, 1)).rejects.toThrow('invalidSenderName');
  }
  await expect(accountService.setName({}, {accountId: 7, name: 'Team'}, 2)).rejects.toThrow('noUserAccount');
  lookup.mockResolvedValue(undefined);
  await expect(accountService.setName({}, {accountId: 7, name: 'Team'}, 1)).rejects.toThrow('noUserAccount');
  expect(state.saved).not.toHaveBeenCalled();
  lookup.mockRestore();
});
