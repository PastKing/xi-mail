# OAuth 與 API 整合

[返回 README](../README-zh-TW.md) · [简体中文](INTEGRATIONS.md) · [English](INTEGRATIONS-en.md)

## 第三方登入設定

在「系統設定 → OAuth 整合」中選擇提供者，填寫 Client ID、Client Secret 並啟用。

| 提供者 | 應用程式設定入口 | 回呼路徑 |
|---|---|---|
| NodeLoc | [應用程式管理](https://www.nodeloc.com/oauth-provider/applications) | `/oauth/nodeloc` |
| Telegram | [BotFather](https://t.me/BotFather) → Login Widget | `/oauth/telegram` |
| Discord | [Developer Portal](https://discord.com/developers/applications) → OAuth2 | `/oauth/discord` |
| GitHub | [Developer settings](https://github.com/settings/developers) → OAuth Apps | `/oauth/github` |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/clients) → 網頁應用程式用戶端 | `/oauth/google` |
| LinuxDo | [LinuxDo Connect](https://connect.linux.do/) | `/oauth/linuxdo` |

頁面會自動產生目前站點的完整回呼網址，僅供讀取。請原樣登記至提供者的應用程式，例如 `https://mail.example.com/oauth/nodeloc`。

- NodeLoc 僅需申請 `openid profile`，不需要電子郵件權限。
- Telegram 使用 OIDC 授權碼與 PKCE，身分權杖簽章由伺服器驗證。
- NodeLoc、LinuxDo 可設定最低信任等級。
- Client Secret 僅保存在伺服器；留空儲存會保留既有密鑰。尚未儲存後台設定時，可使用 Worker 環境變數，欄位請見 [設定範例](../mail-worker/wrangler.example.toml)。

使用者須先依站點的註冊及註冊碼規則建立信箱，再到「個人設定 → 第三方帳號」綁定。第三方登入只會進入已綁定的信箱，不會自動註冊。使用者可自行解除綁定；重新儲存應用程式設定不會刪除綁定紀錄。

## 郵件查詢 API

在系統設定中產生全域 API Token，透過 `x-admin-auth` 請求標頭查詢郵件，無須信箱登入工作階段。

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

請將請求傳送至自己的 Xi-Mail 站點，並以產生的 Token 取代 `<your-token>`。
