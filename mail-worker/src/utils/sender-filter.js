function normalizeAddress(address) {
	return String(address || '').toLowerCase().trim().replace(/^<+|[>)]+$/g, '');
}

// Entries with a local part match one exact sender; others match the domain and its subdomains.
export function matchSenderList(list, address) {
	const sender = normalizeAddress(address);
	const atIdx = sender.lastIndexOf('@');
	if (atIdx <= 0 || !Array.isArray(list)) return false;
	const senderDomain = sender.slice(atIdx + 1);
	return list.some(item => {
		const entry = String(item || '').toLowerCase().trim();
		if (!entry) return false;
		const at = entry.lastIndexOf('@');
		if (at > 0) return entry === sender;
		const d = entry.replace(/^@/, '');
		return !!d && (senderDomain === d || senderDomain.endsWith('.' + d));
	});
}

// A display name must not present a different mailbox than the real sender.
export function safeSenderName(name, address) {
	const clean = String(name || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 200);
	const sender = normalizeAddress(address);
	const shown = clean.match(/[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g) || [];
	if (shown.some(item => normalizeAddress(item) !== sender)) return sender || clean;
	return clean;
}
