<div align="center">

# Xi-Mail

**基于 Cloudflare 全家桶的自托管邮箱服务**

二次开发自 [cloud-mail](https://github.com/eoao/cloud-mail)，UI 全面重设计，功能持续扩展

[![Version](https://img.shields.io/badge/Version-v3.5.0-6366f1)](https://github.com/PastKing/xi-mail/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat&color=6366f1)](https://github.com/PastKing/xi-mail/stargazers)
[![Telegram](https://img.shields.io/badge/Telegram-@pk__oa-26A5E4?logo=telegram)](https://t.me/pk_oa)

[简体中文](README.md) | [English](README-en.md)

</div>

只需一个托管在 Cloudflare 的域名，即可免费部署一套支持多账户、多域名、层级权限的完整邮箱平台。运行在 Workers + D1 + KV + R2 之上，无服务器成本。

---

## 📸 预览

| 登录模板 | 浮岛导航 |
|:---:|:---:|
| ![分栏登录模板](doc/images/template/Split.png) | ![浮岛导航](doc/images/layout/FloatingIsland.png) |
| **域名管理** | **数据分析** |
| ![域名管理](doc/images/system-setting-domain.png) | ![数据分析](doc/images/analysis.png) |

更多模板、布局与功能截图见 [界面预览](doc/PREVIEW.md)。

## 🔑 在线体验

演示站 [mail.azx.us](https://mail.azx.us)，用注册码 `viewUser` 注册（仅限 `@nlfree.me` 后缀）。仅供预览，请勿存放真实邮件。

---

## ✨ 主要特性

**界面**
9 套拥有独立构图的登录模板（包含拆信、邮件终端和邮政护照）+ 6 套主题色，四种登录后布局（完整侧边栏 / 图标侧边栏 / 顶栏导航 / 浮岛导航），全部在系统设置中一键切换并持久化。浮岛布局在桌面端使用悬浮轨道，手机端自动切换为底部 Dock。图标统一使用 `mingcute`，中英文双语，语言偏好随账号跨设备同步。

**用户与账号**
用户 ID 为随机字母数字组合并支持点击复制；单用户最多 100 个邮箱账号，删除后可重建；支持将邮箱连同全部邮件转移给其他用户，接收方可确认或拒绝；角色带 `level` 字段，只能签发权限低于自己的邀请码。

**收发控制**
发件人域名过滤支持黑名单 / 白名单两种模式，白名单模式下只接收授权服务商的邮件；同时校验 SMTP 信封发件人与邮件头 From 地址，支持子域名匹配。另有邮件地址关键词黑名单、注册码提示与获取链接（中英文分别配置）。

**域名管理**
无需改 `wrangler.toml`，在系统设置中直接增删域名、启用禁用，并可拖拽或用上下按钮排序 —— 顺序即注册页邮箱后缀的展示顺序，第一个为默认值。

**部署形态**
支持前后端一体部署，也支持 `build:standalone` 构建纯静态前端部署到 CF Pages / Vercel。前端可同时连接多个 Worker 实例并聚合数据；`mail-worker-sub/` 提供轻量子 Worker 模板，只负责收信和 API，不含用户系统与页面。

**运维接口**
可生成全局 API Token，用 `x-admin-auth` 请求头免登录查询邮件：

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

---

## 🚀 部署

前置条件：Node.js ≥ 20、已 `npx wrangler login`、一个托管在 Cloudflare 并开启 Email Routing 的域名。

```bash
git clone https://github.com/PastKing/xi-mail.git
cd xi-mail/mail-worker && npm install

# 创建 Cloudflare 资源，记录输出的 ID
npx wrangler d1 create xi-mail
npx wrangler kv namespace create kv
npx wrangler r2 bucket create xi-mail

# 填写配置
cp wrangler.example.toml wrangler.toml

# 构建前端并部署
cd ../mail-view && npm install && npm run build
cd ../mail-worker && npx wrangler deploy
```

部署完成后访问 `https://your-worker.workers.dev/api/init/<JWT_SECRET>` 初始化 / 迁移数据库表结构。

`wrangler.toml` 关键字段：

```toml
[vars]
domain      = ["mail.example.com"]   # 域名列表；改用系统设置管理域名后可留空
admin       = "admin@example.com"    # 管理员邮箱，初始化后无法更改
jwt_secret  = "your-secret"          # JWT 密钥，至少 32 位随机字符串
```

### 独立部署前端

```bash
cd mail-view
VITE_BASE_URL=https://your-worker.workers.dev/api npm run build:standalone
# 将 dist/ 部署到 CF Pages / Vercel 等静态托管
```

未配置 `VITE_BASE_URL` 时，首次打开会跳转 `/setup` 引导手动填写 Worker 地址。

更详细的部署说明可参考上游项目 [cloud-mail 文档](https://github.com/eoao/cloud-mail)。

---

## 📋 版本记录

| 版本 | 要点 |
|------|------|
| **v3.5.0** | 邮件列表只查摘要字段并懒加载正文，补齐数据库索引；新增自动清理邮件、同步删除开关、验证码识别一键复制、子地址投递与新邮件通知；子 Worker 支持子地址查询与按天数自动清理 |
| **v3.4.4** | 正文插图改为一步直接插入并支持多选与自动压缩；修复附件路由固定读 KV 导致的 0 字节图片，以及回复转发时站内图片丢失 |
| **v3.4.3** | 浮岛导航改为更克制的窄工具栏与标准移动底栏；更多导航改为单列菜单；前后端禁止主账号邮箱转移 |
| **v3.4.2** | 优化移动端浮岛 Dock、导航高亮与更多面板；修复主题色预览及 Indigo 配色；更新存在安全风险的 XML 解析依赖 |
| **v3.4.1** | 登录模板扩展至 9 套，新增拆信、邮件终端和邮政护照；新增桌面悬浮轨道、移动底部 Dock 的浮岛导航，并优化注册页高度与后缀选择样式 |
| **v3.4.0** | 域名管理改为内联面板并支持排序；系统设置拆分为独立子页面，刷新保留当前分区 |
| **v3.3.x** | 发件人白名单模式；黑白名单合并入同一入口；`/settings` 重排与 ID 点击复制；图标与尺寸统一 |
| **v3.2.x** | 发件人域名屏蔽修复（信封 + From 双检）；侧边栏收窄至 200px |
| **v3.1.0** | 子 Worker 聚合；语言偏好持久化到用户账号 |
| **v3.0.0** | 前后端分离；多 Server 架构；standalone 独立部署 |
| **v2.0.0** | 外观模板系统；登录后主布局切换；系统设置页重构 |

---

## 🛠️ 技术栈与结构

后端 Cloudflare Workers + Hono + Drizzle ORM + D1 / KV / R2；前端 Vue 3 + Vite + Element Plus + Pinia + TailwindCSS 4 + vue-i18n。

```
xi-mail/
├── mail-worker/       # 主 Worker：API、业务逻辑、鉴权、数据库迁移
├── mail-view/         # Vue 3 前端：布局、页面、登录模板、主题色、i18n
├── mail-worker-sub/   # 子 Worker 模板：仅收信 + API，附部署与接口文档
└── doc/images/        # 截图
```

---

## 💬 社区与支持

[GitHub](https://github.com/PastKing/xi-mail) · [Telegram @pk_oa](https://t.me/pk_oa) · 上游项目 [eoao/cloud-mail](https://github.com/eoao/cloud-mail)

若本项目对你有帮助，欢迎捐赠 USDT 支持持续开发：

| 网络 | 地址 |
|------|------|
| BEP20 (BSC) | `0x555390f5c07cf76cc344f42612196e8669e3586b` |
| TRC20 (TRON) | `TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G` |

---

## 📄 许可证

[MIT License](LICENSE)。上游项目 [eoao/cloud-mail](https://github.com/eoao/cloud-mail) 同样采用 MIT 许可证，本项目保留其原始版权声明。
