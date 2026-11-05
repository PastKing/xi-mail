# OAuth 与 API 集成

[返回 README](../README.md) · [繁體中文](INTEGRATIONS-zh-TW.md) · [English](INTEGRATIONS-en.md)

## 部署与邮件认证

登录签名密钥 `jwt_secret` 和数据库初始化密钥 `init_secret` 必须是不同的高强度随机值，通过 Cloudflare Secrets 配置。初始化使用 `/api/init/<INIT_SECRET>`，不要在配置文件或仓库中保存生产密钥；轮换签名密钥后用户需要重新登录。

Telegram 邮件查看链接是独立的随机凭证，24 小时后失效，删除邮件或邮箱、停用账号后也无法读取。旧版 JWT 查看链接不再兼容。

外部域名可正常向本站投递邮件，不要求其属于本站后缀。通过本站发信时，只能使用当前用户拥有且后缀仍启用的邮箱，并遵守角色发信权限。

受管域应按实际发件服务配置 SPF 和 DKIM，并在确认发件认证与域名对齐后设置 DMARC 拒绝策略。Worker 会验证 Cloudflare MX 注入的首条认证结果，拒收未通过认证却声称来自受管域的邮件；子 Worker 应升级到 1.2.1 或以上。DNS 记录需要在域名的权威 DNS 服务商处配置，不能用任意 DKIM 公钥或统一 SPF 记录替代发件服务商提供的值。

## 第三方登录配置

在「系统设置 → OAuth 集成」中选择提供商，填写 Client ID、Client Secret 并启用。

| 提供商 | 应用配置入口 | 回调路径 |
|---|---|---|
| NodeLoc | [应用管理](https://www.nodeloc.com/oauth-provider/applications) | `/oauth/nodeloc` |
| Telegram | [BotFather](https://t.me/BotFather) → Login Widget | `/oauth/telegram` |
| LinuxDo | [LinuxDo Connect](https://connect.linux.do/) | `/oauth/linuxdo` |

页面会自动生成当前站点的完整回调地址，只读显示。将其原样登记到提供商应用，例如 `https://mail.example.com/oauth/nodeloc`。

- NodeLoc 只需申请 `openid profile`，不需要邮箱权限。
- Telegram 使用 OIDC 授权码与 PKCE，身份令牌签名由服务端验证。
- NodeLoc、LinuxDo 可设置最低信任级别。
- Client Secret 仅保存在服务端；输入留空会保留已有密钥。未保存后台配置时，可回退到 Worker 环境变量，字段见 [配置示例](../mail-worker/wrangler.example.toml)。

用户须先按站点的注册与注册码规则创建邮箱，再到「个人设置 → 第三方账号」绑定。第三方登录只进入已绑定的邮箱，不会自动注册。用户可以自行解绑；重新保存应用配置不会删除绑定记录。

## 邮件查询 API

在系统设置中生成全局 API Token，通过 `x-admin-auth` 请求头查询邮件，无需邮箱登录会话。

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

将请求发送到自己的 Xi-Mail 站点，并使用生成的 Token 替换 `<your-token>`。

## Resend 投递状态回调

在「系统设置 → 服务集成 → Resend 投递状态回调」中复制回调地址，在 Resend 的 Webhooks 页面创建对应端点，再将其 Signing Secret 填回设置中。

仅处理签名验证通过的回调。未配置密钥时仍可发送邮件，但不会更新投递、退信等状态。多个 Resend 账户或密钥轮换时可用英文逗号分隔多个 Signing Secret；留空保存会保留已有密钥。也可通过 `wrangler secret put resend_webhook_secret` 配置。
