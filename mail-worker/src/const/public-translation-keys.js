// Only the text used before authentication is exposed by the public language
// pack. The full generated dictionary is available through the authenticated
// translation endpoint after login.
export const PUBLIC_TRANSLATION_KEYS = new Set([
  'attachments', 'authCreate', 'authSignIn', 'botVerifyMsg', 'confirm', 'confirmPwd',
  'confirmPwdFailMsg', 'copySuccess', 'editorialEdition', 'editorialHeadlineFirst',
  'editorialHeadlineLast', 'editorialNote', 'emailAccount', 'emptyEmailMsg', 'emptyPwdMsg',
  'emptyRegKeyMsg', 'envelopeNote', 'getRegKey', 'gridNote', 'loginAccountPlaceholder',
  'loginBtn', 'loginSubTitle', 'loginTitle', 'minEmailPrefix', 'notEmailMsg', 'oauthSignInWith',
  'openSource', 'orDivider', 'passportRoute', 'password', 'passwordLengthCheck',
  'passwordLowerCheck', 'passwordNumberCheck', 'passwordRequirementsMet',
  'passwordRequirementsTitle', 'passwordSpaceCheck', 'passwordSymbolCheck',
  'passwordUpperCheck', 'privateMailbox', 'pwdRuleHint', 'pwdWeakMsg', 'refresh', 'regBtn',
  'regKey', 'regKeyOptional', 'regSubTitle', 'regSuccessMsg', 'regTitle', 'registerAddressHint',
  'serverConnect', 'serverConnectFail', 'serverConnectSuccess', 'serverConnecting', 'serverName',
  'serverNamePlaceholder', 'serverUrl', 'serverUrlPlaceholder', 'setupDesc', 'setupTitle',
  'shareAutoRefresh', 'shareCodeInbox', 'shareConnectionEnded', 'shareConnecting',
  'shareConnected', 'shareCopyAddress', 'shareCopyCode', 'shareCopyManual', 'shareExpires',
  'shareHolderNote', 'shareLatestCode', 'shareLinkDetails', 'shareLoadFailed', 'shareLoadMore',
  'shareLoading', 'shareLoadingHint', 'shareMailbox', 'shareMailboxHint',
  'shareMessageUnavailable', 'sharePreviousCodes', 'shareReadMail', 'shareRecentLimit',
  'shareScopeShort', 'shareTimeRemaining', 'shareTitle', 'shareTryAgain', 'shareUnavailable',
  'shareUnavailableHint', 'shareUpdatedAt', 'shareWaiting', 'shareWaitingHint', 'simpleAndFocused',
  'twoFactorCode', 'twoFactorLoginHint', 'twoFactorTitle', 'verifyModuleFailed',
  'windowAccess', 'windowNote',
]);
