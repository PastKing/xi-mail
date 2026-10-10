import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  resend: vi.fn(), cf: vi.fn(), insert: vi.fn(), count: vi.fn(),
  user: {userId: 1, email: 'user@first.example', type: 1, sendCount: 0},
  role: {sendType: 'day', sendCount: 10, availDomain: '@first.example'},
  account: {accountId: 1, userId: 1, email: 'user@first.example'},
  settings: {}, channels: {}, images: [],
}));
vi.mock('resend', () => ({Resend: class { constructor(token) {this.token = token; this.emails = {send: state.resend};} }}));
vi.mock('../../src/i18n/i18n', () => ({t: key => key}));
vi.mock('../../src/service/setting-service', () => ({default: {query: async () => state.settings}}));
vi.mock('../../src/service/account-service', () => ({default: {selectById: async () => state.account}}));
vi.mock('../../src/service/role-service', () => ({default: {
  selectById: async () => state.role, hasAvailDomainPerm: (domains, address) => domains.includes(address.split('@')[1]),
}}));
vi.mock('../../src/service/user-service', () => ({default: {selectById: async () => state.user, incrUserSendCount: state.count}}));
vi.mock('../../src/service/att-service', () => ({default: {
  toImageUrlHtml: async () => ({imageDataList: state.images, html: '<p>Hello</p>'}),
  saveArticleAtt: vi.fn(), saveSendAtt: vi.fn(), selectByEmailIds: async () => [],
}}));
vi.mock('../../src/entity/orm', () => ({default: () => ({insert: () => ({values: values => {
  state.insert(values); return {returning: () => ({get: async () => ({...values, emailId: 1})})};
}})})}));
vi.mock('../../src/service/telegram-service', () => ({default: {}}));
vi.mock('../../src/service/star-service', () => ({default: {}}));
vi.mock('../../src/service/perm-service', () => ({default: {}}));
vi.mock('../../src/service/verify-record-service', () => ({default: {}}));

import channels from '../../src/service/send-channel-service';
import emailService from '../../src/service/email-service';
import resendService from '../../src/service/resend-service';
import KvConst from '../../src/const/kv-const';

const params = () => ({accountId: 1, receiveEmail: ['outside@example.net'], subject: 'Hello', content: '<p>Hello</p>', text: 'Hello', attachments: []});
const context = () => ({env: {admin: 'owner@first.example', EMAIL: {send: state.cf}, kv: {
  get: vi.fn(async key => key === KvConst.SEND_CHANNELS ? state.channels : null), put: vi.fn(),
}}});

beforeEach(() => {
  vi.restoreAllMocks();
  state.resend.mockReset().mockResolvedValue({data: {id: 'resend-test-id'}});
  state.cf.mockReset().mockResolvedValue({messageId: 'cf-test-id'});
  state.insert.mockClear(); state.count.mockClear();
  state.channels = {}; state.images = [];
  state.settings = {send: 0, domainList: ['@first.example'], resendTokens: {'first.example': 'fake-token'}, r2Domain: ''};
  state.user.sendCount = 0; state.role.sendCount = 10; state.role.sendType = 'day'; state.role.availDomain = '@first.example'; state.account.userId = 1;
});

it('keeps existing Resend domains and IDs working and selects Cloudflare without a token', async () => {
  await emailService.send(context(), params(), 1);
  expect(state.resend).toHaveBeenCalledTimes(1);
  expect(state.cf).not.toHaveBeenCalled();
  expect(state.insert.mock.calls[0][0].resendEmailId).toBe('resend-test-id');
  state.settings.resendTokens = {};
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('noResendToken');
  state.channels = {'first.example': 'cloudflare'};
  state.settings.resendTokens = {};
  await emailService.send(context(), params(), 1);
  expect(state.cf).toHaveBeenCalledTimes(1);
  expect(state.resend).toHaveBeenCalledTimes(1);
  expect(state.insert.mock.calls[1][0]).toMatchObject({resendEmailId: 'cloudflare:cf-test-id', status: 1});
});

it('preserves batch recipients, sender name, reply headers, attachment MIME types and inline CIDs', async () => {
  state.channels = {'first.example': 'cloudflare'};
  state.images = [{filename: 'logo.png', mimeType: 'image/png', content: 'aW1hZ2U=', contentId: 'logo-cid'}];
  vi.spyOn(emailService, 'selectById').mockResolvedValue({messageId: '<original@example.net>'});
  const request = {...params(), name: 'Sender', sendType: 'reply', emailId: 12,
    receiveEmail: ['internal@first.example', 'outside@example.net'],
    attachments: [{filename: 'report.pdf', type: 'application/pdf', content: 'cGRm'}]};
  await emailService.send(context(), request, 1);
  expect(state.cf.mock.calls[0][0]).toEqual({
    from: {email: 'user@first.example', name: 'Sender'}, to: request.receiveEmail,
    subject: 'Hello', text: 'Hello', html: '<p>Hello</p>',
    headers: {'in-reply-to': '<original@example.net>', references: '<original@example.net>'},
    attachments: [
      {filename: 'logo.png', type: 'image/png', content: 'aW1hZ2U=', disposition: 'inline', contentId: 'logo-cid'},
      {filename: 'report.pdf', type: 'application/pdf', content: 'cGRm', disposition: 'attachment'},
    ],
  });
  expect(state.count).toHaveBeenCalledWith(expect.anything(), 2, 1);
});

it('retains ownership, domain, role, quota and system gates before calling either provider', async () => {
  state.channels = {'first.example': 'cloudflare'};
  state.settings.send = 1;
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('disabledSend');
  state.settings.send = 0; state.role.sendType = 'internal';
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('onlyInternalSend');
  state.role.sendType = 'ban';
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('bannedSend');
  state.role.sendType = 'day'; state.user.sendCount = 10;
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('daySendLimit');
  state.user.sendCount = 0; state.account.userId = 2;
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('sendEmailNotCurUser');
  state.account.userId = 1; state.role.availDomain = '@other.example';
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('noDomainPermSend');
  expect(state.cf).not.toHaveBeenCalled(); expect(state.resend).not.toHaveBeenCalled(); expect(state.insert).not.toHaveBeenCalled();
});

it('keeps all-internal mail local, even without external credentials or bindings', async () => {
  const local = vi.spyOn(emailService, 'HandleOnSiteEmail').mockResolvedValue();
  state.settings.resendTokens = {}; state.channels = {'first.example': 'cloudflare'};
  const c = context(); delete c.env.EMAIL;
  await emailService.send(c, {...params(), receiveEmail: ['friend@first.example']}, 1);
  expect(local).toHaveBeenCalledTimes(1); expect(state.cf).not.toHaveBeenCalled(); expect(state.resend).not.toHaveBeenCalled();
});

it('rejects malformed channel settings and unbound Cloudflare before saving', () => {
  expect(channels.validate({'first.example': 'cloudflare'}, ['@first.example'], true)).toEqual({'first.example': 'cloudflare'});
  for (const value of [null, [], 'cloudflare', {'unknown.example': 'resend'}, {'first.example': 'unknown'}]) {
    expect(() => channels.validate(value, ['@first.example'], true)).toThrow('invalidSendChannel');
  }
  expect(() => channels.validate({'first.example': 'cloudflare'}, ['@first.example'], false)).toThrow('cloudflareEmailNotBound');
});

it('reports provider errors without fallback, recording success, or consuming quota', async () => {
  state.channels = {'first.example': 'cloudflare'};
  const c = context(); delete c.env.EMAIL;
  await expect(emailService.send(c, params(), 1)).rejects.toThrow('cloudflareEmailNotBound');
  await expect(emailService.send(context(), {...params(), receiveEmail: Array(51).fill('outside@example.net')}, 1)).rejects.toThrow('daySendLack');
  state.role.sendCount = 100;
  await expect(emailService.send(context(), {...params(), receiveEmail: Array(51).fill('outside@example.net')}, 1)).rejects.toThrow('cloudflareRecipientLimit');
  state.role.sendCount = 10;
  state.cf.mockRejectedValueOnce(Object.assign(new Error('sender'), {code: 'E_SENDER_NOT_VERIFIED'}));
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('cloudflareDomainNotReady');
  state.cf.mockRejectedValueOnce(new Error('timeout'));
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('cloudflareSendFailed');
  state.cf.mockResolvedValueOnce({});
  await expect(emailService.send(context(), params(), 1)).rejects.toThrow('cloudflareSendFailed');
  expect(state.resend).not.toHaveBeenCalled(); expect(state.insert).not.toHaveBeenCalled(); expect(state.count).not.toHaveBeenCalled();
  await expect(resendService.webhooks({}, {data: {email_id: 'cloudflare:cf-test-id'}, type: 'email.delivered'})).rejects.toThrow('Invalid Resend email ID');
});
