// Object metadata can originate in an anonymous email. Never copy it into HTTP headers.
export const OBJECT_CSP = "sandbox; default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function attachmentDisposition(filename, inline = false) {
	const cleaned = Array.from(String(filename || 'download').slice(0, 512))
		.map(character => {
			const code = character.codePointAt(0);
			return code >= 0xd800 && code <= 0xdfff ? '\ufffd' : character;
		}).join('').replace(/[\x00-\x1f\x7f]/g, '_');
	const fallback = cleaned.replace(/[^\x20-\x7e]|["\\]/g, '_');
	const encoded = encodeURIComponent(cleaned).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
	return `${inline ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function filenameFromMetadata(metadata, key) {
	const disposition = String(metadata.contentDisposition || '');
	const extended = disposition.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;\r\n]*)/i);
	if (extended) {
		try { return decodeURIComponent(extended[1].trim()); } catch { /* Fall back to a plain filename. */ }
	}
	const plain = disposition.match(/(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;\r\n]*))/i);
	return plain ? (plain[1] !== undefined ? plain[1].replace(/\\(.)/g, '$1') : plain[2].trim()) : String(key).split('/').pop();
}

function imageType(content) {
	const bytes = content instanceof ArrayBuffer ? new Uint8Array(content)
		: ArrayBuffer.isView(content) ? new Uint8Array(content.buffer, content.byteOffset, content.byteLength) : new Uint8Array();
	const starts = signature => bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
	const text = (start, end) => String.fromCharCode(...bytes.subarray(start, end));
	if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
	if (starts([255, 216, 255])) return 'image/jpeg';
	if (['GIF87a', 'GIF89a'].includes(text(0, 6))) return 'image/gif';
	if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
	if (starts([66, 77])) return 'image/bmp';
	if (starts([0, 0, 1, 0])) return 'image/x-icon';
	if (text(4, 8) === 'ftyp' && ['avif', 'avis'].includes(text(8, 12))) return 'image/avif';
	return null;
}

export function safeObjectMetadata(content, key, metadata = {}) {
	const declared = String(metadata.contentType || '').split(';')[0].trim().toLowerCase();
	const normalized = ({ 'image/jpg': 'image/jpeg', 'image/vnd.microsoft.icon': 'image/x-icon' })[declared] || declared;
	const actual = imageType(content);
	const safeImage = actual !== null && actual === normalized;
	const inline = safeImage && !/^\s*attachment(?:\s*;|\s*$)/i.test(String(metadata.contentDisposition || ''));
	return {
		contentType: safeImage ? actual : 'application/octet-stream',
		contentDisposition: attachmentDisposition(filenameFromMetadata(metadata, key), inline),
		cacheControl: safeImage ? 'public, max-age=86400' : 'no-store',
	};
}

export function safeObjectHeaders(content, key, metadata) {
	const safe = safeObjectMetadata(content, key, metadata);
	return {
		'Content-Type': safe.contentType,
		'Content-Disposition': safe.contentDisposition,
		'Cache-Control': safe.cacheControl,
		'Content-Security-Policy': OBJECT_CSP,
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'no-referrer',
	};
}
