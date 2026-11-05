import { emailViewer, escapeHtml } from './email-viewer';

export default function emailTextTemplate(text) {
	return emailViewer(`<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(text)}</pre>`);
}
