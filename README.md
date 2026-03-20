<div align="center">

# Xi-Mail

**基于 Cloudflare 全家桶的自托管临时邮箱服务**

二次开发自 [cloud-mail](https://github.com/eoao/cloud-mail) · UI 全面重设计 · 功能持续扩展

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/PastKing/xi-mail?color=6366f1)](https://github.com/PastKing/xi-mail/releases)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat&color=6366f1)](https://github.com/PastKing/xi-mail/stargazers)
[![Telegram](https://img.shields.io/badge/Telegram-@pk__oa-26A5E4?logo=telegram)](https://t.me/pk_oa)

[简体中文](README.md) | [English](README-en.md)

</div>

---

## 📖 项目简介

Xi-Mail 是基于 **Cloudflare Workers / D1 / KV / R2** 构建的全栈自托管邮箱服务，在 [cloud-mail](https://github.com/eoao/cloud-mail) 开源项目基础上进行二次开发，带来全面 UI 重设计与一系列新功能。

只需一个托管于 Cloudflare 的域名，即可免费部署支持多账户、多域名、层级权限的完整邮箱平台。

---

## ✨ 相比上游新增 / 改动

### 🎨 UI 全面重设计（Linear 风格）
- 采用 **TailwindCSS 4** + **@vueuse/motion** 动画库重构前端样式系统
- 登录 / 注册页：磨砂玻璃卡片 + 动态渐变背景光晕 + 网格装饰
- 侧边栏：深色极简风格，图标统一
- 顶栏：紧凑布局，渐变 Compose 按钮，用户信息面板优化
- 全局设计 Token：indigo-violet 渐变色系、彩色阴影、统一圆角

### 👤 用户系统增强
- **Display ID**：用户 ID 改为随机字母数字组合（`xxxx-xxxx-xxxx`），不再使用纯数字自增
- Display ID 展示于：用户详情面板、个人设置页、顶栏头像悬浮卡片
- **邮箱转移**：用户可将邮箱账户及其全部邮件转移给其他用户（通过 Display ID 指定），接收方可确认或拒绝

### 📬 账号管理优化
- 收件箱 / 已发送页侧边栏账号列表：新增搜索过滤，显示完整邮件地址（便于多账号区分）
- 账号操作下拉菜单始终可见（含邮箱转移入口）

### 🔄 转移功能页（`/transfer`）
- 独立侧边栏页面，支持发起转移、查看待处理 / 已发送转移请求
- 顶栏 Badge 实时显示待处理数量

### 🛡️ 权限系统重设计
- 角色新增 `level` 字段（数值越大权限越高）
- 用户只能为权限等级低于自身的角色生成邀请码
- 邀请码生成时服务端严格校验等级约束

### 🗂️ 批量操作（用户管理）
- 支持批量封禁、批量解封、批量删除选中用户

### ⚙️ 系统设置增强
- **全局 API Token**：管理员可开启并生成全局 Token，通过 `x-admin-auth` 请求头无需登录直接查询指定邮箱的邮件（`GET /api/admin/mails`）
- **邮件地址关键词黑名单**：防止普通用户注册含 `admin` 等敏感词的邮箱地址（管理员可跳过检查）
- 域名映射 UI 优化（展示系统已有域名供快速选择）
- 自动封禁设置对齐修复，移除冗余的"登录背景"和"登录透明度"配置

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Cloudflare Workers |
| Web 框架 | Hono |
| ORM | Drizzle ORM |
| 数据库 | Cloudflare D1 (SQLite) |
| 缓存 / 会话 | Cloudflare KV |
| 文件存储 | Cloudflare R2 |
| 前端框架 | Vue 3 + Vite |
| UI 组件库 | Element Plus |
| CSS 工具 | TailwindCSS 4 |
| 动画库 | @vueuse/motion |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 国际化 | vue-i18n（中文 / 英文）|

---

## 📁 目录结构

```
xi-mail/
├── mail-worker/                 # Cloudflare Worker 后端
│   ├── src/
│   │   ├── api/                 # 接口路由层
│   │   ├── service/             # 业务逻辑层
│   │   ├── entity/              # Drizzle 数据库实体
│   │   ├── security/            # JWT 身份认证 + 权限中间件
│   │   ├── init/                # 数据库初始化 / 版本迁移
│   │   └── index.js             # Worker 入口
│   └── wrangler.example.toml    # 配置模板（复制为 wrangler.toml 后填写）
│
└── mail-view/                   # Vue 3 前端
    ├── src/
    │   ├── layout/              # 布局组件（侧边栏 / 顶栏 / 账号栏）
    │   ├── views/               # 页面组件
    │   ├── components/          # 通用组件
    │   ├── store/               # Pinia 状态管理
    │   ├── i18n/                # 国际化（zh / en）
    │   └── style.css            # 全局样式 / 设计 Token
    └── vite.config.js
```

---

## 🚀 快速部署

### 前置要求

- Node.js ≥ 20
- 已登录 Cloudflare 账户：`npx wrangler login`
- 一个托管在 Cloudflare 的域名，并配置好邮件路由（Email Routing）

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/PastKing/xi-mail.git
cd xi-mail/mail-worker

# 2. 安装依赖
npm install

# 3. 创建 Cloudflare 资源
npx wrangler d1 create xi-mail          # 记录输出的 database_id
npx wrangler kv namespace create kv     # 记录输出的 id
npx wrangler r2 bucket create xi-mail

# 4. 配置 wrangler.toml
cp wrangler.example.toml wrangler.toml
# 编辑 wrangler.toml，填入上一步获得的 ID、域名列表、管理员邮箱、JWT 密钥

# 5. 构建前端
cd ../mail-view
npm install
npm run build

# 6. 初始化数据库并部署
cd ../mail-worker
npx wrangler deploy

# 7. 初始化数据库表结构（首次部署后访问）
# 在浏览器中访问：https://your-worker.workers.dev/api/init/<JWT_SECRET>
```

### wrangler.toml 关键字段说明

```toml
[vars]
domain      = ["mail.example.com"]   # 邮箱域名列表（JSON 数组）
admin       = "admin@example.com"    # 管理员邮箱（首次初始化后无法更改）
jwt_secret  = "your-secret"          # JWT 签名密钥（至少 32 位随机字符串）
```

> 部署更详细的说明请参考上游项目：[cloud-mail 部署文档](https://github.com/eoao/cloud-mail)

---

## 📡 全局 API Token

系统设置 → 安全 → **全局 API Token** 中开启并生成 Token 后，可通过以下接口无需登录查询邮件：

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

响应格式：

```json
{
  "results": [...],
  "count": 100
}
```

---

## 💬 社区 & 支持

| 渠道 | 链接 |
|------|------|
| GitHub | [PastKing/xi-mail](https://github.com/PastKing/xi-mail) |
| Telegram 频道 | [@pk_oa](https://t.me/pk_oa) |
| 上游项目 | [eoao/cloud-mail](https://github.com/eoao/cloud-mail) |

### 捐款 (USDT)

如果本项目对你有帮助，欢迎捐款支持持续开发：

| 网络 | 地址 |
|------|------|
| BEP20 (BSC) | `0x555390f5c07cf76cc344f42612196e8669e3586b` |
| TRC20 (TRON) | `TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G` |

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

原项目 [eoao/cloud-mail](https://github.com/eoao/cloud-mail) 同样采用 MIT 许可证，本项目保留原始版权声明。
