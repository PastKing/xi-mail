// Add supported providers here as their server-side authorization flow is implemented.
export const OAUTH_PROVIDERS = [
  { id: 'nodeloc', name: 'NodeLoc', apiId: 'nodeloc', applicationUrl: 'https://www.nodeloc.com/oauth-provider/applications', trustLevel: true,
    callbackPath: '/oauth/nodeloc', logo: '/image/nodeloc.png', guideKey: 'oauthNodeLocGuide',
    docsUrl: 'https://docs.nodeloc.com/api-reference/introduction' },
  { id: 'telegram', name: 'Telegram', apiId: 'telegram', applicationUrl: 'https://t.me/BotFather',
    callbackPath: '/oauth/telegram', logo: '/image/telegram.svg', guideKey: 'oauthTelegramGuide' },
  { id: 'github', name: 'GitHub', apiId: 'github', applicationUrl: 'https://github.com/settings/developers',
    callbackPath: '/oauth/github', logo: '/image/github.svg', guideKey: 'oauthGitHubGuide',
    docsUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app' },
  { id: 'google', name: 'Google', apiId: 'google', applicationUrl: 'https://console.cloud.google.com/auth/clients',
    callbackPath: '/oauth/google', logo: '/image/google.svg', guideKey: 'oauthGoogleGuide',
    docsUrl: 'https://developers.google.com/identity/openid-connect/openid-connect' },
  { id: 'linuxdo', name: 'LinuxDo', apiId: 'linuxDo', applicationUrl: 'https://connect.linux.do/', trustLevel: true,
    callbackPath: '/oauth/linuxdo', logo: '/image/linuxdo.webp', guideKey: 'oauthGuideNote' },
]
