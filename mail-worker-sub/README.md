# Xi-Mail Sub Worker

1.2.1 增加 Cloudflare 发件人认证结果的校验和同步。升级后 `/init` 会迁移 `auth_result` 字段，首次收信或同步也会自动迁移。主 Worker 会拒绝缺少有效认证结果、却声称来自受管域的邮件；旧子 Worker 应同步升级。域名还应按实际发件服务配置 SPF、DKIM 和 DMARC。

外部域可正常来信；认证结果仅用于受管发件域的防冒用校验。

轻量子 Worker —— 只负责接收邮件和提供查询 API，无用户系统、无登录页面。

子 Worker 收到的邮件由主 Worker 在服务端拉取，API Token 不会暴露给浏览器。子 Worker 可以和主 Worker 部署在同一个 Cloudflare 账号，也可以部署在另一个账号。

前置条件：Node.js ≥ 20；子 Worker 要用的域名已托管在 Cloudflare，且状态为「有效 / Active」（状态为 Pending 的域名无法开启 Email Routing）。

## 1. 安装依赖

```bash
cd mail-worker-sub
npm install
```

## 2. 登录 Cloudflare 账号

**和主 Worker 用同一个账号**：本机已经执行过 `npx wrangler login` 就可以直接进入下一步，后面的命令都用 `npx wrangler ...`。

**用另一个账号（推荐用于分摊额度）**：为了不影响本机已登录的主账号，使用目录里的 `cf.ps1`（Windows PowerShell）。它会在独立的子进程里运行 wrangler，登录信息只保存在 `mail-worker-sub/.cf-home`。

在 `mail-worker-sub` 下新建 `.cf.env`（已被 gitignore，不会提交）：

```ini
CLOUDFLARE_ACCOUNT_ID=子账号的 Account ID
# 二选一：API Token（需 Workers Scripts、D1 的编辑权限）
CLOUDFLARE_API_TOKEN=...
# 或者 wrangler 的 OAuth 令牌，配合 refresh token 会自动续期
# CLOUDFLARE_OAUTH_TOKEN=...
# CLOUDFLARE_REFRESH_TOKEN=...
```

验证登录的是子账号：

```powershell
./cf.ps1 whoami
```

> 下文命令里的 `npx wrangler` 在这种方式下都换成 `./cf.ps1`，例如 `./cf.ps1 deploy`。

## 3. 创建数据库并填写配置

```bash
npx wrangler d1 create xi-mail-sub   # 记录输出的 database_id
cp wrangler.example.toml wrangler.toml
```

编辑 `wrangler.toml`（已被 gitignore）：

```toml
account_id = "子账号的 Account ID"   # 可选，写上可以防止部署到错误的账号

[[d1_databases]]
binding = "db"
database_name = "xi-mail-sub"
database_id = "上一步的 database_id"

[vars]
api_token = "至少 32 位的随机字符串"   # 主 Worker 用它访问子 Worker
domain = ["a.com", "b.com"]           # 子 Worker 负责收信的域名
auto_clean_days = 0                    # 邮件保留天数，0 表示永久保留
```

## 4. 部署并初始化

```bash
npx wrangler deploy

# 初始化数据库（只需执行一次）
curl -H "x-api-token: <api_token>" https://xi-mail-sub.<你的子域>.workers.dev/init
# 返回 Database initialized 即成功

# 确认能读到域名
curl -H "x-api-token: <api_token>" https://xi-mail-sub.<你的子域>.workers.dev/api/info
```

## 5. 配置 Email Routing

对 `domain` 里的每个域名：

1. Cloudflare 控制台 → 选择域名 → **Email → Email Routing**，首次使用点「启用」，按提示添加 MX / TXT 记录
2. **Routing rules → Catch-all address** → 编辑：Action 选 **Send to a Worker**，Worker 选 `xi-mail-sub`，并启用

配置完成后给该域名任意地址发一封信，执行下面的命令能看到邮件即说明收信正常：

```bash
curl -H "x-api-token: <api_token>" "https://xi-mail-sub.<你的子域>.workers.dev/api/sync?address=test@a.com"
```

## API

所有接口需要 `x-api-token` header 认证。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/info` | 返回名称、域名列表、版本号 |
| GET | `/api/domains` | 域名列表 |
| GET | `/api/addresses` | 已收到邮件的地址列表（按最新排序，最多 200 条） |
| GET | `/api/mails?address=xxx&limit=20&offset=0` | 按地址查询邮件列表（含子地址 `xxx+tag@domain` 的邮件） |
| GET | `/api/mail/:id` | 单封邮件详情（含 HTML 内容） |
| GET | `/api/sync?address=xxx&after=0&limit=20` | 增量拉取 `email_id > after` 的完整邮件，供主 Worker 同步 |

### 请求示例

```bash
# 查询域名列表
curl -H "x-api-token: your-token" https://your-sub-worker.workers.dev/api/domains

# 查询邮件
curl -H "x-api-token: your-token" "https://your-sub-worker.workers.dev/api/mails?address=test@sub-domain.com&limit=10"
```

## 6. 与主 Worker 对接

1. 在主 Worker 的 **系统设置 → 子服务器** 中点击「添加子服务器」
2. 填入名称、子 Worker 的 URL（如 `https://xi-mail-sub.<你的子域>.workers.dev`）和 `api_token`
3. 点击「测试连接」验证后保存，列表中会显示读取到的域名（子 Worker 改了域名后点「重新读取域名」）
4. 子 Worker 的域名会出现在主站的域名列表中：用户可直接添加该域名的邮箱（普通用户需在「权限等级」里放开该域名）
5. 主站每分钟（以及打开收件箱、全部邮件时）从子 Worker 拉取新邮件，按主站的收信规则投递：有对应邮箱的进入该邮箱，没有的按「无收件人邮件」设置进入「全部邮件」。之后和普通邮件一样查看、星标、删除

> 每分钟同步依赖主 Worker `wrangler.toml` 里的 `crons = ["0 16 * * *", "* * * * *"]`，没有第二项时只在有人打开邮件页面时同步。

> 主 Worker 需 v3.5.9 及以上，子 Worker 需 1.2.0 及以上。

## 与主 Worker 的区别

| 特性 | 主 Worker (mail-worker) | 子 Worker (mail-worker-sub) |
|------|------------------------|---------------------------|
| 用户系统 | 有（注册、登录、权限） | 无 |
| 前端页面 | 有（mail-view） | 无 |
| 邮件接收 | 有 | 有 |
| 邮件发送 | 有（Resend / QueenSMTP） | 无 |
| 附件存储 | R2 / S3 | 无 |
| 认证方式 | JWT | API Token |
| 数据库 | D1（多表） | D1（仅 email 表） |
