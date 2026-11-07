export const OAUTH_PROVIDERS = [
  { id: 'nodeloc', name: 'NodeLoc', apiId: 'nodeloc', scope: 'openid profile', trustLevel: true,
    authorizeUrl: 'https://www.nodeloc.com/oauth-provider/authorize', tokenUrl: 'https://www.nodeloc.com/oauth-provider/token',
    userInfoUrl: 'https://www.nodeloc.com/oauth-provider/userinfo' },
  { id: 'telegram', name: 'Telegram', apiId: 'telegram', scope: 'openid profile', basicAuth: true, pkce: true,
    authorizeUrl: 'https://oauth.telegram.org/auth', tokenUrl: 'https://oauth.telegram.org/token' },
  { id: 'linuxdo', name: 'LinuxDo', apiId: 'linuxDo', trustLevel: true,
    authorizeUrl: 'https://connect.linux.do/oauth2/authorize', tokenUrl: 'https://connect.linux.do/oauth2/token',
    userInfoUrl: 'https://connect.linux.do/api/user', basicAuth: true },
];
export const findOAuthProvider = id => OAUTH_PROVIDERS.find(provider => provider.id === id);
