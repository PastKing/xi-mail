# ☁️ Cloudflare 一键部署

本仓库已内置 `mail-worker/wrangler.toml`，无需本地环境，直接在 Cloudflare 连接本仓库即可
一键构建并部署前后端。

## 1. 准备 Cloudflare 资源

在 Cloudflare Dashboard 创建以下资源：

- **D1 数据库**（必需）
- **KV Namespace**（必需）
- **R2 Bucket**（可选，不创建则附件回退到 KV 存储）

## 2. 连接 Cloudflare 并部署

1. Cloudflare → **Workers & Pages** → **Create application** → **Import a repository**，
   选择本仓库。
2. 关键配置：
   - **Production branch**：`main`
   - **Build command**：留空（由 `wrangler.toml` 的 `[build]` 负责前端构建）
   - **Deploy command**：`npx wrangler deploy`
   - **Root directory**：`/mail-worker`
   - Worker 名称与 `wrangler.toml` 的 `name = "xi-mail"` 一致。
3. 点 **Save and Deploy**。

## 3. 配置绑定与变量

在 Worker 的 **Settings** 里配置（仓库本身不含任何 ID / 密钥）：

### Bindings

| 绑定 | 绑定名（固定） | 选择 |
|---|---|---|
| D1 database | `db` | 你的 D1 数据库 |
| KV namespace | `kv` | 你的 KV Namespace |
| R2 bucket | `r2` | 你的 R2 桶（可选） |

### Variables and Secrets

| 类型 | 名称 | 值 |
|---|---|---|
| Variable | `domain` | JSON 数组，如 `["mail.example.com"]` |
| Variable | `admin` | 管理员邮箱，如 `admin@mail.example.com` |
| Secret | `jwt_secret` | 较长随机串，勿含 `? % # / \` |
| Variable | `orm_log` | `false` |

可选：LinuxDo OAuth 需 `linuxdo_switch/client_id/client_secret/callback_url`。

## 4. 校验绑定生效

部署日志中确认绑定列表包含 `db` / `kv`：

```text
Your Worker has access to the following bindings:
env.assets               Assets
env.orm_log (false)      Environment Variable
env.db                   D1 Database
env.kv                   KV Namespace
```

若只有 `assets`：Binding 未生效，补绑定后重新部署。

## 5. 初始化数据库

绑定生效后，访问（返回 `success` 即成功）：

```text
https://你的worker域名/api/init/<jwt_secret>
```

## 6. 配置收信域名（Email Routing）

1. Cloudflare → 邮箱域名 → **Email → Email Routing** → 开启。
2. 添加 **MX** 与 **SPF（TXT）** 记录。
3. **Routing rules** → 添加路由 → 动作 "Send to a Worker" → Worker 选 `xi-mail`。
4. 可选：添加 **DKIM** 记录提升投递率。

> 仅用 `*.workers.dev` 测试时可不配 Email Routing，登录与站内信可用，外域收信需以上配置。

## 7. 常见问题

- **构建失败 / 前端报错**：查看构建日志；尽量不改 `package.json`，保持与上游一致。
- **收不到外域邮件**：检查绑定是否生效（见第 4 步），以及 Email Routing 的 MX/SPF/路由。
- **登录后 401 / authExpired**：确认 KV 绑定生效，`jwt_secret` 与初始化时一致。
- **附件异常**：`r2` 未绑定正常回退到 KV；超大附件（>25MB）可补 R2。
