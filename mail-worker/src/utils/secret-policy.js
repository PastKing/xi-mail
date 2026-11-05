export function isSecureSecret(secret) {
	return typeof secret === 'string' && secret.length >= 32 && new Set(secret).size >= 12
		&& !/(?:\$\{JWT_SECRET\}|<[^>]+>|your[-_ ]|change[-_ ]?me|example)/i.test(secret);
}
