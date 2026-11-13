const encoder = new TextEncoder();

const PBKDF2_PREFIX = 'pbkdf2$';
// workerd rejects PBKDF2 above 100000 iterations.
const PBKDF2_ITERATIONS = 100000;
const DUMMY_HASH = PBKDF2_PREFIX + PBKDF2_ITERATIONS + '$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function toBase64(buffer) {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function safeEqual(a, b) {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

const saltHashUtils = {

	DUMMY_HASH,

	generateSalt(length = 16) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array));
	},

	async hashPassword(password) {
		const salt = this.generateSalt();
		const hash = await this.pbkdf2(password, salt, PBKDF2_ITERATIONS);
		return { salt, hash };
	},

	async pbkdf2(password, salt, iterations) {
		const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
		const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, key, 256);
		return PBKDF2_PREFIX + iterations + '$' + toBase64(bits);
	},

	// Legacy single-round SHA-256, kept only to verify and upgrade old hashes.
	async genHashPassword(password, salt) {
		const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + password));
		return toBase64(hashBuffer);
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (typeof inputPassword !== 'string' || typeof storedHash !== 'string' || typeof salt !== 'string') return false;
		if (storedHash.startsWith(PBKDF2_PREFIX)) {
			const iterations = Number(storedHash.slice(PBKDF2_PREFIX.length).split('$')[0]);
			if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
			return safeEqual(await this.pbkdf2(inputPassword, salt, iterations), storedHash);
		}
		return safeEqual(await this.genHashPassword(inputPassword, salt), storedHash);
	},

	needsRehash(storedHash) {
		return typeof storedHash !== 'string' || !storedHash.startsWith(PBKDF2_PREFIX + PBKDF2_ITERATIONS + '$');
	},

	genRandomPwd(length = 16) {
		const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!#$%*+-_.'];
		const alphabet = groups.join('');
		const index = n => {
			const limit = 256 - 256 % n, byte = new Uint8Array(1);
			do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
			return byte[0] % n;
		};
		const pick = chars => chars[index(chars.length)];
		const result = groups.map(pick);
		while (result.length < length) result.push(pick(alphabet));
		for (let i = result.length - 1; i > 0; i--) {
			const j = index(i + 1);
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result.join('');
	}
};

export default saltHashUtils;
