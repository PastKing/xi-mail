// Add supported providers here as their server-side authorization flow is implemented.
export const OAUTH_PROVIDERS = [
  { id: 'nodeloc', name: 'NodeLoc', apiId: 'nodeloc', applicationUrl: 'https://www.nodeloc.com/oauth-provider/applications', trustLevel: true,
    callbackPath: '/oauth/nodeloc', logo: '/image/nodeloc.png', guideKey: 'oauthNodeLocGuide',
    docsUrl: 'https://docs.nodeloc.com/api-reference/introduction' },
  { id: 'telegram', name: 'Telegram', apiId: 'telegram', applicationUrl: 'https://t.me/BotFather',
    callbackPath: '/oauth/telegram', logo: '/image/telegram.svg', guideKey: 'oauthTelegramGuide' },
  { id: 'linuxdo', name: 'LinuxDo', apiId: 'linuxDo', applicationUrl: 'https://connect.linux.do/', trustLevel: true,
    callbackPath: '/oauth/linuxdo', logo: '/image/linuxdo.webp', guideKey: 'oauthGuideNote' },
]
