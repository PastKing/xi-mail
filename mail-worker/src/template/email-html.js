import domainUtils from '../utils/domain-uitls';
import { emailViewer } from './email-viewer';

export default function emailHtmlTemplate(html, domain) {
	// Replace attachment placeholders before encoding the entire srcdoc attribute.
	const content = String(html || '').replace(/{{domain}}/g, () => domainUtils.toOssDomain(domain) + '/');
	return emailViewer(content);
}
