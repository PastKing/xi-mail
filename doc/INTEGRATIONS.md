# OAuth 与 API 集成

[返回 README](../README.md) · [繁體中文](INTEGRATIONS-zh-TW.md) · [English](INTEGRATIONS-en.md)


## SendFlare 与角色权限

Resend、QueenSMTP、SendFlare 统一在「系统设置 → 邮件设置 → 发件服务 → 管理」中配置。添加时选择服务、域名并填写 API Token；点击已配置的服务可替换或移除 Token，并可按域名选择默认服务。SendFlare 支持单封、多个收件人、附件和内嵌图片；发件地址仍须为本人拥有且启用的邮箱。接口按 [SendFlare 官方文档](https://docs.sendflare.com/docs/api/integration/) 实现。

「发件箱」在同一列表展示已发送与草稿，草稿以编辑图标和「草稿」标签区分，点击继续编辑；旧 `/drafts` 链接打开统一发件箱。「角色权限」新增转移记录查看、发起转移、接收转移和关联登录账号，新权限默认不授予普通角色，请管理员按需勾选。转移接收还须满足角色后缀和邮箱配额，已有第三方绑定仍可用于登录。






集成设计参考 [OmniMail](https://github.com/mibgb65-cloud/OmniMail)；邮件、草稿和权限体系沿用 Xi-Mail。

## 限时收件箱分享

管理员先在「角色权限 → 邮箱分享」授予「分享收件箱」。用户在收件箱邮箱列表的更多菜单中选择「分享收件箱」，设置 1～168 小时有效期，生成后复制外链。接收方无需登录，可查看此邮箱在链接创建后收到的所有邮件，阅读正文、打开登录链接并下载附件；识别到的验证码仍可一键复制。每 15 秒自动刷新，每页 20 封，可继续加载更早的邮件。分享页不提供发信或邮箱管理操作。

每个账号最多同时保留 10 个有效链接，可在同一窗口撤销。完整链接仅在创建时显示一次，请自行保存；持有者均可阅读新邮件，请勿公开发布。邮箱删除或转移、账号停用会永久作废已有链接，重新恢复也不会复活；收回分享权限后链接同样不可用。正文与附件每次读取均重新核验分享有效期和邮箱归属，邮件 HTML 沿用清洗与沙箱保护。

## 邮件部署与认证

登录签名密钥 `jwt_secret` 和数据库初始化密钥 `init_secret` 必须是不同的高强度随机值，通过 Cloudflare Secrets 配置。初始化使用 `/api/init/<INIT_SECRET>`，不要在配置文件或仓库中保存生产密钥；轮换签名密钥后用户需要重新登录。

Telegram 邮件查看链接是独立的随机凭证，24 小时后失效，删除邮件或邮箱、停用账号后也无法读取。旧版 JWT 查看链接不再兼容。

未匹配到已创建邮箱、进入「全部邮件」的来信，也可通过已配置的 Telegram 转发查看。此类链接仅授权单封未分配邮件，邮件删除或改变归属后失效。未配置有效 HTTPS 查看域名时，通知不显示查看按钮。

外部域名可正常向本站投递邮件，不要求其属于本站后缀。通过本站发信时，只能使用当前用户拥有且后缀仍启用的邮箱，并遵守角色发信权限。

受管域应按实际发件服务配置 SPF 和 DKIM，并在确认发件认证与域名对齐后设置 DMARC 拒绝策略。Worker 会验证 Cloudflare MX 注入的首条认证结果，拒收未通过认证却声称来自受管域的邮件；子 Worker 应升级到 1.2.1 或以上。DNS 记录需要在域名的权威 DNS 服务商处配置，不能用任意 DKIM 公钥或统一 SPF 记录替代发件服务商提供的值。

## 第三方登录配置

在「系统设置 → OAuth 集成」中选择提供商，填写 Client ID、Client Secret 并启用。

| 提供商 | 应用配置入口 | 回调路径 |
|---|---|---|
| NodeLoc | [应用管理](https://www.nodeloc.com/oauth-provider/applications) | `/oauth/nodeloc` |
| Telegram | [BotFather](https://t.me/BotFather) → Login Widget | `/oauth/telegram` |
| GitHub | [Developer settings](https://github.com/settings/developers) → OAuth Apps | `/oauth/github` |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/clients) → Web 应用客户端 | `/oauth/google` |
| LinuxDo | [LinuxDo Connect](https://connect.linux.do/) | `/oauth/linuxdo` |

页面会自动生成当前站点的完整回调地址，只读显示。将其原样登记到提供商应用，例如 `https://mail.example.com/oauth/nodeloc`。

- NodeLoc 只需申请 `openid profile`，不需要邮箱权限。
- Telegram 使用 OIDC 授权码与 PKCE，身份令牌签名由服务端验证。
- GitHub 使用授权码与 PKCE，只获取登录身份；Google 使用 OIDC 与 PKCE，校验签名、受众和 nonce，不申请 Gmail 权限。
- Google 应用若处于测试模式，须先将登录者加入测试用户；公开使用时应按 Google 控制台要求配置受众与发布状态。
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
