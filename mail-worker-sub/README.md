# Xi-Mail Sub Worker

轻量子 Worker —— 只负责接收邮件和提供查询 API，无用户系统、无登录页面。

部署后由主 Worker 通过代理层调用，API Token 不暴露给浏览器。

## 快速部署

```bash
cd mail-worker-sub
npm install

# 创建 D1 数据库
npx wrangler d1 create xi-mail-sub   # 记录 database_id

# 配置
cp wrangler.example.toml wrangler.toml
# 编辑 wrangler.toml：填入 database_id、api_token（随机 32 位字符串）、domain（JSON 数组）
# 可选：auto_clean_days 邮件保留天数（0 = 永久保留）

# 部署
npx wrangler deploy

# 初始化数据库（只需执行一次）
curl -H "x-api-token: <your-token>" https://your-sub-worker.workers.dev/init
```

## 配置 Email Routing

在 Cloudflare Dashboard 中为子 Worker 的域名配置 Email Routing：

1. 进入域名 → Email → Email Routing → Routing rules
2. 添加 Catch-all 规则，Action 选择 "Send to Worker"，选择 `xi-mail-sub`

## API

所有接口需要 `x-api-token` header 认证。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/info` | 返回名称、域名列表、版本号 |
| GET | `/api/domains` | 域名列表 |
| GET | `/api/addresses` | 已收到邮件的地址列表（按最新排序，最多 200 条） |
| GET | `/api/mails?address=xxx&limit=20&offset=0` | 按地址查询邮件列表（含子地址 `xxx+tag@domain` 的邮件） |
| GET | `/api/mail/:id` | 单封邮件详情（含 HTML 内容） |

### 请求示例

```bash
# 查询域名列表
curl -H "x-api-token: your-token" https://your-sub-worker.workers.dev/api/domains

# 查询邮件
curl -H "x-api-token: your-token" "https://your-sub-worker.workers.dev/api/mails?address=test@sub-domain.com&limit=10"
```

## 与主 Worker 对接

1. 在主 Worker 的 **系统设置 → 子服务器** 中点击「添加子服务器」
2. 填入名称、子 Worker 的 URL（如 `https://xi-mail-sub.workers.dev`）和 API Token
3. 点击「测试连接」验证后保存
4. 子 Worker 的域名邮件将聚合显示在主 Worker 的前端中

## 与主 Worker 的区别

| 特性 | 主 Worker (mail-worker) | 子 Worker (mail-worker-sub) |
|------|------------------------|---------------------------|
| 用户系统 | 有（注册、登录、权限） | 无 |
| 前端页面 | 有（mail-view） | 无 |
| 邮件接收 | 有 | 有 |
| 邮件发送 | 有（Resend） | 无 |
| 附件存储 | R2 / S3 | 无 |
| 认证方式 | JWT | API Token |
| 数据库 | D1（多表） | D1（仅 email 表） |
