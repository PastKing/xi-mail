// Trust ONLY the first Authentication-Results field prepended by Cloudflare's MX.
// Sender-supplied later fields, quoted values and comments cannot supply a passing result.
export function firstAuthenticationResult(value) {
	let result = '', depth = 0, quoted = false, escape = false;
	for (const character of String(value || '').slice(0, 16384).replace(/\r?\n[ \t]+/g, ' ')) {
		if (escape) { escape = false; continue; }
		if (character === '\\') { escape = true; continue; }
		if (!quoted && character === '(') { depth++; continue; }
		if (depth) { if (character === ')') depth--; continue; }
		if (character === '"') { quoted = !quoted; continue; }
		if (quoted) { result += /[a-z0-9@._-]/i.test(character) ? character : '_'; continue; }
		if (character === ',' || character === '\r' || character === '\n') break;
		result += character;
	}
	return depth || quoted ? '' : result.trim();
}

function domain(value) {
	const input = String(value || '').trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '');
	return input.includes('@') ? input.slice(input.lastIndexOf('@') + 1) : input;
}

export function managedSender(address, domains) {
	const sender = domain(address);
	return !!sender && domains.some(value => { const name = domain(value); return name && (sender === name || sender.endsWith('.' + name)); });
}

export function authenticatedSender(address, authenticationResults) {
	const parts = firstAuthenticationResult(authenticationResults).split(';').map(part => part.trim());
	if (!/^mx\.cloudflare\.net(?:\s+\d+)?$/i.test(parts.shift() || '')) return false;
	if (parts.some(part => /^dmarc\s*=\s*(?!pass(?:\s|$)|none(?:\s|$))\S+/i.test(part))) return false;
	const sender = domain(address);
	const aligned = identity => { const name = domain(identity); return name && (name === sender || name.endsWith('.' + sender)); };
	for (const part of parts) {
		const match = /^(dmarc|dkim|spf)\s*=\s*pass(?:\s|$)/i.exec(part);
		if (!match) continue;
		const property = name => new RegExp('(?:^|\\s)' + name.replace('.', '\\.') + '\\s*=\\s*([^\\s;]+)', 'i').exec(part)?.[1];
		if (match[1].toLowerCase() === 'dmarc') {
			const from = property('header.from');
			return !from || domain(from) === sender;
		}
		if (match[1].toLowerCase() === 'dkim' && aligned(property('header.d'))) return true;
		if (match[1].toLowerCase() === 'spf' && aligned(property('smtp.mailfrom'))) return true;
	}
	return false;
}

export function managedDomainList(settings = {}, env = {}) {
	const configured = Array.isArray(env.domain) ? env.domain : [];
	return [...(settings.domainList || []), ...configured, ...Object.keys(settings.domainMapping || {}), ...Object.values(settings.domainMapping || {})];
}
