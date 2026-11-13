import { describe, it, expect } from 'vitest';
import cryptoUtils from '../../src/utils/crypto-utils';
import { isStrongPassword, assertStrongPassword } from '../../src/utils/password-policy';
import { matchSenderList, safeSenderName } from '../../src/utils/sender-filter';
import { isObjectKey } from '../../src/utils/object-key-policy';
import fileUtils from '../../src/utils/file-utils';
import sessionService from '../../src/service/session-service';

describe('Password policy', () => {
	it.each(['Abcdef1.', 'Xi-mail2026!', 'aB3@aaaa', 'Zz9#zzzzzzzz'])('accepts %s', pwd => {
		expect(isStrongPassword(pwd)).toBe(true);
	});
	it.each(['Abc1.', 'abcdef1.', 'ABCDEF1.', 'Abcdefg.', 'Abcdefg1', 'Abc def1.', 'A1.' + 'a'.repeat(62), '', null, 12345678])('rejects %s', pwd => {
		expect(isStrongPassword(pwd)).toBe(false);
		expect(() => assertStrongPassword(pwd)).toThrow();
	});
	it('generates random passwords that satisfy the policy', () => {
		for (let i = 0; i < 50; i++) expect(isStrongPassword(cryptoUtils.genRandomPwd())).toBe(true);
	});
});

describe('Password hashing', () => {
	it('stores new passwords with PBKDF2 and verifies them', async () => {
		const { salt, hash } = await cryptoUtils.hashPassword('Abcdef1.');
		expect(hash.startsWith('pbkdf2$100000$')).toBe(true);
		expect(await cryptoUtils.verifyPassword('Abcdef1.', salt, hash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('Abcdef1,', salt, hash)).toBe(false);
		expect(cryptoUtils.needsRehash(hash)).toBe(false);
	});
	it('still verifies legacy SHA-256 hashes and flags them for upgrade', async () => {
		const salt = 'legacy-salt';
		const legacy = await cryptoUtils.genHashPassword('123456', salt);
		expect(await cryptoUtils.verifyPassword('123456', salt, legacy)).toBe(true);
		expect(await cryptoUtils.verifyPassword('1234567', salt, legacy)).toBe(false);
		expect(cryptoUtils.needsRehash(legacy)).toBe(true);
	});
	it('rejects malformed PBKDF2 records and the dummy hash', async () => {
		expect(await cryptoUtils.verifyPassword('x', 's', 'pbkdf2$999999999$AAAA')).toBe(false);
		expect(await cryptoUtils.verifyPassword('x', 's', 'pbkdf2$abc$AAAA')).toBe(false);
		expect(await cryptoUtils.verifyPassword('anything', 'xi-mail-login-dummy-salt', cryptoUtils.DUMMY_HASH)).toBe(false);
		expect(await cryptoUtils.verifyPassword(undefined, 's', cryptoUtils.DUMMY_HASH)).toBe(false);
	});
	it('never persists password hashes in session records', async () => {
		let stored;
		const c = { env: { jwt_secret: 'Qw3rTy7uIoP1aS5dFgH9jKlZ2xCvBnM8', kv: { put: async (k, v) => { stored = JSON.parse(v); } } } };
		await sessionService.save(c, 1, { tokens: [], sessions: {}, user: { userId: 1, email: 'a@b.cc', password: 'h', salt: 's' } });
		expect(stored.user).toEqual({ userId: 1, email: 'a@b.cc' });
	});
});

describe('Sender filtering', () => {
	it('matches address-form entries exactly and domain entries by domain', () => {
		const list = ['support@spydialer.com', 'boxbilisim.com', '@spam.org'];
		expect(matchSenderList(list, 'support@spydialer.com')).toBe(true);
		expect(matchSenderList(list, 'SUPPORT@SpyDialer.com')).toBe(true);
		expect(matchSenderList(list, 'sales@spydialer.com')).toBe(false);
		expect(matchSenderList(list, 'probe@boxbilisim.com')).toBe(true);
		expect(matchSenderList(list, 'a@mx.spam.org')).toBe(true);
		expect(matchSenderList(list, 'a@notspam.org')).toBe(false);
		expect(matchSenderList(list, '')).toBe(false);
	});
	it('replaces display names that impersonate another mailbox', () => {
		expect(safeSenderName('admin@azx.us', 'probe@evil.example')).toBe('probe@evil.example');
		expect(safeSenderName('Admin <admin@azx.us>', 'probe@evil.example')).toBe('probe@evil.example');
		expect(safeSenderName('GitHub', 'noreply@github.com')).toBe('GitHub');
		expect(safeSenderName('noreply@github.com', 'NoReply@GitHub.com')).toBe('noreply@github.com');
		expect(safeSenderName('Bad\r\nName', 'a@b.cc')).toBe('BadName');
	});
});

describe('Object keys', () => {
	it.each(['attachments/0123abcd.png', 'attachments/0123abcd', 'static/background/ab12.jpg', 'static/ab12.css', 'attachments/abc.中文'])('accepts %s', key => {
		expect(isObjectKey(key)).toBe(true);
	});
	it.each(['setting:', 'global:token', 'public_key:', 'auth-uid:2', 'website:subtitle', 'attachments/..', 'attachments/a/b', 'attachments/', 'static/background/', 'attachments/a\nb', 'Attachments/a.png'])('rejects %s', key => {
		expect(isObjectKey(key)).toBe(false);
	});
	it('derives new object keys with a server secret and safe extensions', async () => {
		const buff = new TextEncoder().encode('same content');
		const plain = await fileUtils.getBuffHash(buff);
		const keyed = await fileUtils.getBuffHash(buff, 'secret-a');
		expect(keyed).toMatch(/^[0-9a-f]{32}$/);
		expect(keyed).not.toBe(plain);
		expect(await fileUtils.getBuffHash(buff, 'secret-a')).toBe(keyed);
		expect(await fileUtils.getBuffHash(buff, 'secret-b')).not.toBe(keyed);
		expect(fileUtils.getExtFileName('a.PNG')).toBe('.png');
		expect(fileUtils.getExtFileName('a.b/c')).toBe('');
		expect(fileUtils.getExtFileName('noext')).toBe('');
		expect(fileUtils.getExtFileName(undefined)).toBe('');
	});
});
