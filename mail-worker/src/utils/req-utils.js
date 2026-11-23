import { UAParser } from 'ua-parser-js';
const reqUtils = {
	getIp(c) {
		// Cloudflare Workers supplies this edge-derived value. Forwarding headers
		// are client-controlled unless a separate trusted proxy chain is parsed.
		return c.req.header('CF-Connecting-IP') || 'Unknown';
	},

	getUserAgent(c) {
		const ua = c.req.header('user-agent') || '';

		const parser = new UAParser(ua);
		const { browser, device, os } = parser.getResult();

		let browserInfo = null;
		let osInfo = null;

		if (browser.name) {
			browserInfo = browser.name + ' ' + browser.version;
		}

		if (os.name) {
			osInfo = os.name + os.version;
		}

		let deviceInfo = 'Desktop';

		const hasVendor = !!device?.vendor;
		const hasModel = !!device?.model;

		if (hasVendor || hasModel) {
			const vendor = device.vendor || '';
			const model = device.model || '';
			const type = device.type || '';

			const namePart = [vendor, model].filter(Boolean).join(' ');
			const typePart = type ? ` (${type})` : '';
			deviceInfo = (namePart + typePart).trim();
		}

		return {browser: browserInfo || '', device: deviceInfo || '', os: osInfo || ''}
	}
}

export default reqUtils
