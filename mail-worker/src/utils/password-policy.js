import BizError from '../error/biz-error';
import { t } from '../i18n/i18n.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export function isStrongPassword(password) {
	return typeof password === 'string'
		&& password.length >= PASSWORD_MIN_LENGTH
		&& password.length <= PASSWORD_MAX_LENGTH
		&& !/\s/.test(password)
		&& /[A-Z]/.test(password)
		&& /[a-z]/.test(password)
		&& /[0-9]/.test(password)
		&& /[^A-Za-z0-9]/.test(password);
}

export function assertStrongPassword(password) {
	if (typeof password === 'string' && password.length > PASSWORD_MAX_LENGTH) throw new BizError(t('pwdLengthLimit'));
	if (!isStrongPassword(password)) throw new BizError(t('pwdWeak'));
}
