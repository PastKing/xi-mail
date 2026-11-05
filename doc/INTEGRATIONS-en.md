# OAuth and API integration

[Back to README](../README-en.md) · [简体中文](INTEGRATIONS.md) · [繁體中文](INTEGRATIONS-zh-TW.md)

## Deployment and mail authentication

Configure independent, strong random `jwt_secret` and `init_secret` values using Cloudflare Secrets. Initialize through `/api/init/<INIT_SECRET>`. Keep production secrets out of configuration files and source control. Rotating the signing key requires users to sign in again.

Telegram mail links use separate random capabilities that expire after 24 hours. Deleted mail/mailboxes and disabled accounts cannot be accessed. Legacy JWT mail links are no longer supported.

External domains can deliver mail to this site without being hosted here. Outgoing mail through this site must use an active mailbox owned by the current user, with a currently enabled domain and the required role permissions.

Configure SPF and DKIM for the actual sending provider, then enable DMARC rejection after validating alignment. The Worker trusts only the first authentication result injected by Cloudflare MX and rejects unauthenticated mail claiming a managed sender domain. Upgrade sub Workers to 1.2.1 or later. Publish DNS records at the authoritative DNS provider using the sending provider's actual values.

## Provider configuration

Select a provider in **System Settings → OAuth Integration**, enter its Client ID and Client Secret, and enable sign-in.

| Provider | Application settings | Callback path |
|---|---|---|
| NodeLoc | [Applications](https://www.nodeloc.com/oauth-provider/applications) | `/oauth/nodeloc` |
| Telegram | [BotFather](https://t.me/BotFather) → Login Widget | `/oauth/telegram` |
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

## Resend delivery status webhooks

Copy the callback URL from **System Settings → Service Integration → Resend delivery status webhook**. Create that endpoint in Resend Webhooks and enter its Signing Secret in Xi-Mail.

Only verified callbacks are processed. Sending still works without a configured secret, but delivery and bounce statuses will not be updated. Separate multiple Signing Secrets with commas to support multiple Resend accounts or key rotation. Saving a blank field preserves existing secrets. Alternatively, configure `wrangler secret put resend_webhook_secret`.
