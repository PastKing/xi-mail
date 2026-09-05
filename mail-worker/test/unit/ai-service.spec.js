import { describe, expect, it } from 'vitest';
import aiService from '../../src/service/ai-service';

const idMeText = `Welcome!

Thanks for creating an ID.me Wallet!
ID.me simplifies how you verify and share your identity online, while helping keep your information safe.

You can confirm your email address by clicking the link below.
https://track.pstmrk.it/3ts/api.id.me%2Fen%2Fconfirmations%2Fd49aab9a02e508226d1454c3a0052260%2Fcomplete%3Fcode%3D446329/weg/UNnHAQ/AQ/7bfa3555-4411-4ba4-b39c-3ede86d15b7c/2/3s5FV8LnSg

Can't see the link in this email?
Copy the code below and enter it in your browser to complete the confirmation.
446329

You're receiving this email because you signed up for an ID.me Wallet on 09/05/2026 at ChatGPT.
`;

const zedText = `To complete your sign-up, we need to verify your student status. Click the button below to get verified:

Get Verified [https://dashboard.zed.dev/education/verify?token=bbeb5e77-2dee-4ac2-9655-481c475208fe]

If the link isn't working, you can also verify manually by entering this code on the verification page:

bbeb5e77-2dee-4ac2-9655-481c475208fe

Questions? Reach us at education@zed.dev [education@zed.dev].
—The Zed Team
`;

const chatgptHtml = `<html><head><title>Your temporary ChatGPT verification code</title>
<style type="text/css">#bodyTable { width: 560px; }</style></head>
<body><center><table><tr><td>
<p style="font-size: 16px;">Enter this temporary verification code to continue:</p>
<p style="font-size: 24px;">
<!--[if mso]><span><![endif]-->
870633
<!--[if mso]></span><![endif]-->
</p>
<p>Or continue with the secure button below:</p>
<p><a href="https://auth.openai.com/magic-link#token=i07y8O9ptCt_jvXFSZrty5uX_zbZPufz4Tf0HAGGoAs">Continue with secure link</a></p>
<p>Please ignore this email if this wasn't you trying to create a ChatGPT account.</p>
</td></tr></table></center></body></html>`;

const gandiText = `Hello,

Your provider, Amazon Registrar, Inc., has sent us a request to delete the domain name: XIXIXI.AI.
As an accredited registrar we need the explicit approval of the owner of the domain name to verify a deletion request.

To proceed with the deletion of the domain name XIXIXI.AI without delay, please verify your approval by clicking on the following link:
https://domainnameverification.net/domain_delete/?fqdn=XIXIXI.AI&authcode=5135414666b96cef09ed125618b42e0b

If, however, you do not want to delete the domain name XIXIXI.AI, please contact Amazon Registrar, Inc. support immediately or, if necessary, write to us at the following address: abuse@support.gandi.net.

Gandi.net
Domain name registration partner for Amazon Route 53
`;

function regexCode(email) {
	const source = aiService.buildSource(email);
	return aiService.extractCodeByRegex(source);
}

describe('正则兜底', () => {

	it('取出 ID.me 正文里独立成行的验证码', () => {
		expect(regexCode({ subject: 'Welcome to ID.me', text: idMeText })).toBe('446329');
	});

	it('取出 ChatGPT HTML 正文里的验证码', () => {
		expect(regexCode({ subject: 'Your temporary ChatGPT verification code', html: chatgptHtml })).toBe('870633');
	});

	it('不把 Zed 的 UUID 截成短码', () => {
		expect(regexCode({ subject: 'Verify your student status', text: zedText })).toBe('');
	});

	it('不把链接里的 authcode 当验证码', () => {
		expect(regexCode({ subject: 'Deletion of the domain name XIXIXI.AI', text: gandiText })).toBe('');
	});
});

describe('模型结果校验', () => {

	const source = aiService.buildSource({ subject: 'Your temporary ChatGPT verification code', html: chatgptHtml });

	it('接受原文中独立出现的完整验证码', () => {
		expect(aiService.appearsAsToken('870633', source)).toBe(true);
	});

	it('拒绝被截断的验证码', () => {
		expect(aiService.appearsAsToken('8706', source)).toBe(false);
	});

	it('拒绝 UUID 的前 8 位', () => {
		const zedSource = aiService.buildSource({ subject: 'Verify your student status', text: zedText });
		expect(aiService.appearsAsToken('bbeb5e77', zedSource)).toBe(false);
	});

	it('拒绝链接里 authcode 的前 8 位', () => {
		const gandiSource = aiService.buildSource({ subject: 'Deletion of the domain name XIXIXI.AI', text: gandiText });
		expect(aiService.appearsAsToken('51354146', gandiSource)).toBe(false);
	});

	it('拒绝超长或不含数字的模型输出', () => {
		expect(aiService.normalizeCode('bbeb5e77-2dee-4ac2-9655-481c475208fe')).toBe('');
		expect(aiService.normalizeCode('verified')).toBe('');
		expect(aiService.normalizeCode('870633')).toBe('870633');
	});

	it('解析模型返回的 JSON', () => {
		expect(aiService.parseAiCode({ response: '{"code":"870633"}' })).toBe('870633');
		expect(aiService.parseAiCode({ response: '{"code":""}' })).toBe('');
		expect(aiService.parseAiCode({ response: 'sure, here you go' })).toBe('');
	});
});
