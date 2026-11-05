export const EMAIL_VIEWER_CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: http: data: blob:; font-src https: data:; frame-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

export function escapeHtml(value) {
	return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function emailViewer(content) {
	// Sender content is data in an encoded attribute, never JavaScript source or outer HTML.
	// The opaque-origin frame has NO script, form, top-navigation or same-origin permission.
	const policy = EMAIL_VIEWER_CSP.replace("frame-src 'self'", "frame-src 'none'");
	const document = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}"><meta name="referrer" content="no-referrer"><base target="_blank"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:12px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${content}</body></html>`;
	return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(EMAIL_VIEWER_CSP)}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email</title><style>html,body{margin:0;height:100%;background:#fff}iframe{display:block;border:0;width:100%;height:100%}</style></head><body><iframe title="Email content" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" srcdoc="${escapeHtml(document)}"></iframe></body></html>`;
}
