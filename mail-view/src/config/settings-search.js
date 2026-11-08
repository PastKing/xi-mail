// Public setting labels only; never index configured values or credentials.
export const SETTINGS_SEARCH_KEYS = {
 website:['websiteReg','loginDomain','regKey','regKeyHint','regKeyHintEn','regKeyLink','websiteTitle','websiteSubtitle'],
 security:['autoBan','banMessage','emailKeywordBlacklist','senderDomainBlacklist','syncDelete','autoCleanEmail','newEmailNotify','globalToken'],
 registration:['addAccount','multipleEmail','emailPrefix','randomPrefixLength','receiveEmail','autoRefresh','sendEmail','noRecipientTitle','sendProvider'],
 domain:['domainList','domainMapping'],
 integration:['workersAi','aiModel','aiCodeEnable','s3Configuration','storageType','tgBot','otherEmail','forwardingRules','signUpVerification','addEmailVerification','noticeTitle','noticePopup','popUp','resendWebhookTitle'],
 oauth:['oauthIntegration'], 'sub-workers':['subWorkerManage'], appearance:['colorTheme','layoutMode','loginTemplate'],servers:['serverManage'],about:['about'],
};
export const SETTINGS_SEARCH_ALIASES = {
 senderDomainBlacklist:['senderDomainWhitelist','senderDomainWhitelistDesc','senderFilterModeDesc'],
 emailPrefix:['mustNotContain','mustNotContainDesc'],
 autoCleanEmail:['autoCleanExclude'],
 sendProvider:['Resend QueenSMTP SendFlare token SMTP'],
 signUpVerification:['Cloudflare Turnstile CAPTCHA Site Key Secret Key'],
 addEmailVerification:['Cloudflare Turnstile CAPTCHA'],
 oauthIntegration:['NodeLoc Telegram Discord DC LinuxDo GitHub Google OAuth Client ID Client Secret'],
 s3Configuration:['S3 R2 AWS storage'],tgBot:['Telegram Bot token Chat ID'],
};
