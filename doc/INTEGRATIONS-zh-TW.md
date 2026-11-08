# OAuth 與 API 整合

[返回 README](../README-zh-TW.md) · [简体中文](INTEGRATIONS.md) · [English](INTEGRATIONS-en.md)


## SendFlare 與角色權限

Resend、QueenSMTP、SendFlare 統一在「系統設定 → 郵件設定 → 寄信服務 → 管理」中設定。新增時選擇服務、網域及 API Token；點選既有服務可更換或移除 Token，並可按網域選擇預設服務。SendFlare 支援單封、批次收件者、附件及內嵌圖片，依 [官方 API](https://docs.sendflare.com/docs/api/integration/) 實作；寄件地址仍須為本人擁有且啟用的信箱。

寄件匣在同一清單顯示已傳送郵件與草稿，草稿以編輯圖示與「草稿」標籤區分，點擊繼續編輯；舊 `/drafts` 網址開啟統一寄件匣。角色新增轉移記錄查看、發起／接收移轉與關聯登入帳號，新權限預設不授予一般角色，由管理員勾選。接收移轉另受角色網域及信箱配額限制，既有第三方綁定仍可登入。






整合設計參考 [OmniMail](https://github.com/mibgb65-cloud/OmniMail)。

## 限時收件匣分享

管理員先在「角色權限 → 信箱分享」授予「分享收件匣」。使用者從收件匣信箱清單的更多選單開啟分享，設定 1～168 小時有效期並複製外部連結。訪客不需登入，可閱讀連結建立後收到的所有郵件、開啟登入連結及下載附件，辨識出的驗證碼仍可一鍵複製。每 15 秒自動重新整理，每頁 20 封並可繼續載入較早郵件，不開放寄信或信箱管理。

每個帳號最多同時保留 10 個有效連結，可在同一視窗撤銷。完整連結只在建立時顯示一次，持有者皆可閱讀新郵件，請妥善保存。信箱刪除或移轉、帳號停用會永久作廢既有連結，恢復後也不會重新生效；撤回分享權限後也無法使用。每次讀取內文與附件皆重新檢查有效期及信箱歸屬，HTML 沿用清洗與沙箱保護。

## 郵件部署與驗證

登入簽章密鑰 `jwt_secret` 與資料庫初始化密鑰 `init_secret` 必須是不同的高強度隨機值，透過 Cloudflare Secrets 設定。初始化使用 `/api/init/<INIT_SECRET>`，不要將正式環境密鑰存入設定檔或儲存庫；輪換簽章密鑰後使用者需要重新登入。

Telegram 郵件檢視連結使用獨立的隨機憑證，24 小時後失效，刪除郵件或信箱、停用帳號後也無法讀取。不再相容舊版 JWT 檢視連結。

未對應到已建立信箱、進入「全部郵件」的來信，也能透過已設定的 Telegram 轉寄檢視。此類連結僅授權單封未分配郵件，郵件刪除或改變歸屬後失效。未設定有效的 HTTPS 檢視網域時，通知不顯示檢視按鈕。

外部網域可正常向本站投遞郵件，不必屬於本站後綴。透過本站寄信時，只能使用目前使用者擁有且後綴仍啟用的信箱，並遵守角色寄信權限。

受管網域應依實際寄件服務設定 SPF 與 DKIM，確認驗證及網域對齊後再設定 DMARC 拒絕策略。Worker 僅信任 Cloudflare MX 注入的首筆驗證結果，拒收未通過驗證卻聲稱來自受管網域的郵件；子 Worker 應升級至 1.2.1 以上。DNS 記錄須在權威 DNS 服務商設定，並使用寄件服務商提供的實際值。

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

## Resend 投遞狀態回呼

在「系統設定 → 服務整合 → Resend 投遞狀態回呼」複製回呼網址，於 Resend 的 Webhooks 頁面建立對應端點，再將其 Signing Secret 填回設定中。

僅處理簽章驗證通過的回呼。尚未設定密鑰時仍可寄信，但不會更新投遞、退信等狀態。多個 Resend 帳號或密鑰輪替時，可用英文逗號分隔多個 Signing Secret；留空儲存會保留既有密鑰。也可透過 `wrangler secret put resend_webhook_secret` 設定。
