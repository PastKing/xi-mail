# OAuth and API integration

[Back to README](../README-en.md) · [简体中文](INTEGRATIONS.md) · [繁體中文](INTEGRATIONS-zh-TW.md)

## Provider configuration

Select a provider in **System Settings → OAuth Integration**, enter its Client ID and Client Secret, and enable sign-in.

| Provider | Application settings | Callback path |
|---|---|---|
| NodeLoc | [Applications](https://www.nodeloc.com/oauth-provider/applications) | `/oauth/nodeloc` |
| Telegram | [BotFather](https://t.me/BotFather) → Login Widget | `/oauth/telegram` |
| Discord | [Developer Portal](https://discord.com/developers/applications) → OAuth2 | `/oauth/discord` |
| GitHub | [Developer settings](https://github.com/settings/developers) → OAuth Apps | `/oauth/github` |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/clients) → Web application client | `/oauth/google` |
| LinuxDo | [LinuxDo Connect](https://connect.linux.do/) | `/oauth/linuxdo` |

The page generates a read-only callback URL for your site. Register that exact URL with the provider, for example `https://mail.example.com/oauth/nodeloc`.

- NodeLoc needs only `openid profile`, without email access.
- Telegram uses OIDC authorization codes with PKCE and server-side ID token signature verification.
- NodeLoc and LinuxDo support a minimum trust level.
- Client secrets stay on the server. Leave the field blank to keep an existing secret. Worker environment variables are used as a fallback until settings are saved; see the [configuration example](../mail-worker/wrangler.example.toml).

Users must first create a mailbox through the site's registration and invitation-code rules, then link a provider in **Personal Settings → Connected accounts**. Provider sign-in only opens an already linked mailbox and never creates an account automatically. Users can disconnect providers; saving application settings again does not delete existing connections.

## Mail query API

Generate a global API token in System Settings and send it in the `x-admin-auth` header. A mailbox login session is not required.

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

Send the request to your own Xi-Mail site and replace `<your-token>` with the generated token.
