# Xi Mail

基于 [Cloud Mail](https://github.com/eoao/cloud-mail) 二次开发的 Cloudflare 邮箱服务，在原项目基础上进行了 UI 全面重设计与功能扩展。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat)](https://github.com/PastKing/xi-mail/stargazers)

简体中文 | [English](README-en.md)

---

## 项目简介

Xi Mail 是基于 Cloudflare 全家桶（Workers / D1 / KV / R2）构建的自托管邮箱服务。只需一个域名，即可搭建支持多账户、多域名、权限管理的完整邮箱平台。

> 上游项目：[maillab/cloud-mail](https://github.com/eoao/cloud-mail)
> 本项目在上游基础上进行了 UI 重设计与功能增强，感谢上游作者的开源贡献。

---

## 二次开发新增 / 修改内容

### UI 全面重设计（Linear 风格）
- 采用 **TailwindCSS 4** + **@vueuse/motion** 动画库
- 登录 / 注册页：磨砂玻璃卡片 + 动态渐变背景光晕 + 网格装饰
- 侧边栏：深色极简风格，统一导航图标
- 顶栏：紧凑布局，渐变 Compose 按钮，用户信息面板优化
- 全局设计 Token：Linear 风格 indigo-violet 渐变色系、彩色阴影、圆角统一

### 用户系统增强
- **Display ID**：用户 ID 改为随机字母数字组合（`xxxx-xxxx-xxxx`），不再使用纯数字自增
- Display ID 显示于：用户详情面板、个人设置页、顶栏头像悬浮卡片
- **邮箱转移**：用户可将邮箱账户及其邮件转移给其他用户（通过 Display ID 指定），接收方可确认或拒绝

### 账号管理优化
- 收件箱 / 已发送页侧边栏账号列表：新增搜索过滤，显示完整邮件地址（便于多账号区分）
- 账号列表始终显示操作下拉菜单（含转移入口）

### 转移功能页（`/transfer`）
- 独立侧边栏页面，支持发起转移、查看待处理 / 已发送转移请求
- 顶栏 Badge 实时显示待处理数量

### 权限系统重设计
- 角色新增 `level` 字段（数值越大权限越高）
- 用户只能创建权限等级低于自身的邀请码
- 邀请码生成时校验等级约束

### 批量操作（用户管理）
- 支持批量封禁、批量解封、批量删除

### 系统设置增强
- 新增邮件地址关键词黑名单（管理员可跳过检查，防止普通用户注册含 `admin` 等敏感词的邮箱）
- 移除"登录背景"和"登录透明度"等冗余配置项
- 域名映射 UI 优化（展示系统已有域名供快速选择）
- 自动封禁月数设置对齐修复

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Cloudflare Workers |
| Web 框架 | Hono |
| ORM | Drizzle ORM |
| 数据库 | Cloudflare D1 (SQLite) |
| 缓存 | Cloudflare KV |
| 文件存储 | Cloudflare R2 |
| 前端框架 | Vue 3 + Vite |
| UI 组件库 | Element Plus |
| CSS 工具 | TailwindCSS 4 |
| 动画库 | @vueuse/motion |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 国际化 | vue-i18n |

---

## 目录结构

```
xi-mail
├── mail-worker          # Cloudflare Worker 后端
│   ├── src
│   │   ├── api          # 接口路由层
│   │   ├── dao          # 数据访问层
│   │   ├── service      # 业务逻辑层
│   │   ├── entity       # 数据库实体
│   │   ├── security     # 身份权限认证
│   │   └── index.js     # 入口文件
│   └── wrangler.toml    # Cloudflare 部署配置
│
└── mail-view            # Vue 3 前端
    ├── src
    │   ├── layout       # 布局组件（侧边栏 / 顶栏 / 账号栏）
    │   ├── views        # 页面组件
    │   ├── components   # 通用组件
    │   ├── store        # Pinia 状态管理
    │   ├── i18n         # 国际化（中文 / 英文）
    │   └── style.css    # 全局样式 / 设计 Token
    └── vite.config.js
```

---

## 快速部署

### 前置要求

- Node.js >= 20
- 已登录 Cloudflare 账户（`npx wrangler login`）
- 一个托管在 Cloudflare 的域名

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/PastKing/xi-mail.git
cd xi-mail

# 2. 安装后端依赖
cd mail-worker
npm install

# 3. 创建 D1 数据库
npx wrangler d1 create xi-mail

# 4. 创建 KV 命名空间
npx wrangler kv namespace create kv

# 5. 创建 R2 存储桶
npx wrangler r2 bucket create xi-mail

# 6. 编辑 wrangler.toml，填入上述创建的 ID 及域名、管理员邮箱、JWT 密钥

# 7. 初始化数据库
npx wrangler d1 execute xi-mail --remote --file=./src/db/schema.sql

# 8. 构建前端
cd ../mail-view
npm install
npm run build

# 9. 部署
cd ../mail-worker
npx wrangler deploy
```

详细部署文档请参考上游项目：[部署文档](https://github.com/eoao/cloud-mail)

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

原项目 [maillab/cloud-mail](https://github.com/eoao/cloud-mail) 同样采用 MIT 许可证，本项目保留原始版权声明。

---

## 致谢

- 感谢 [maillab/cloud-mail](https://github.com/eoao/cloud-mail) 提供优秀的开源基础
- 感谢 Cloudflare 提供强大的边缘计算平台
