# OAuth 与 API 集成

[返回 README](../README.md) · [繁體中文](INTEGRATIONS-zh-TW.md) · [English](INTEGRATIONS-en.md)

## 第三方登录配置

在「系统设置 → OAuth 集成」中选择提供商，填写 Client ID、Client Secret 并启用。

| 提供商 | 应用配置入口 | 回调路径 |
|---|---|---|
| NodeLoc | [应用管理](https://www.nodeloc.com/oauth-provider/applications) | `/oauth/nodeloc` |
| Telegram | [BotFather](https://t.me/BotFather) → Login Widget | `/oauth/telegram` |
| Discord | [Developer Portal](https://discord.com/developers/applications) → OAuth2 | `/oauth/discord` |
| GitHub | [Developer settings](https://github.com/settings/developers) → OAuth Apps | `/oauth/github` |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/clients) → Web 应用客户端 | `/oauth/google` |
| LinuxDo | [LinuxDo Connect](https://connect.linux.do/) | `/oauth/linuxdo` |

页面会自动生成当前站点的完整回调地址，只读显示。将其原样登记到提供商应用，例如 `https://mail.example.com/oauth/nodeloc`。

- NodeLoc 只需申请 `openid profile`，不需要邮箱权限。
- Telegram 使用 OIDC 授权码与 PKCE，身份令牌签名由服务端验证。
- Discord 使用授权码与 PKCE，仅请求 `identify`，不需要创建 Bot 或邀请进服务器。
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
