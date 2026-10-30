# 企业微信邮件推送

后台入口：系统设置 → 集成 → 邮件推送 → 企业微信机器人。

1. 在企业微信群创建自定义机器人，复制 Webhook。
2. 打开配置，粘贴地址，可以先“发送测试”。
3. 开启推送并保存；新收件按已有“转发规则”推送。

地址必须为 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=BOT_KEY`。
重新打开配置不会返回完整地址。输入框留空保留原机器人；填写新地址后保存可替换。关闭开关保留地址，方便重新启用。

测试只发送固定示例消息，不保存、不启用配置；有新地址时测试新地址，否则测试已保存地址。只读设置权限不能修改或测试。

正文优先使用 PostalMime 解析出的纯文本；HTML-only 邮件保留可读文本、链接地址和图片替代文本，不发送附件。每段控制在 1900 个 UTF-8 字节内，重复邮件元信息并标记分段。异常长元信息会截断显示，原邮件不受影响。

新通知在邮件完成入库、通过既有转发规则后以 `ctx.waitUntil` 执行。关闭收件、拒收、不匹配规则时不推送；通知失败仅记录不含地址/正文的通用日志，不中断收件、Telegram 或邮箱转发。不重试已经发送的分段。

企业微信有单机器人每分钟 20 条消息的限制，长邮件每段计一条；达到限额可能导致后续分段发送失败。本实现不新增持久队列或补发任务。每次请求超时为 10 秒，也受 Workers 后台任务时限约束。

官方协议核对：2026-10-30，企业微信开发者中心《消息推送配置说明》，文档路径 `/document/path/99110`（页面标示最后更新 2025-08-07）。

## Worker API 契约

路径以现有 `/api` 前缀访问：

| 方法与路径 | 权限 | 请求 / 返回 |
| --- | --- | --- |
| `GET /setting/wecom/query` | `setting:query` 或系统管理员 | 返回 `{enabled: boolean, hasWebhook: boolean}`，`Cache-Control: no-store` |
| `PUT /setting/wecom/set` | `setting:set` 或系统管理员 | `{enabled: boolean, webhookUrl?: string}`；空地址保留原值 |
| `POST /setting/wecom/test` | `setting:set` 或系统管理员 | `{webhookUrl?: string}`；空地址使用已保存配置 |

响应沿用 `{code, message, data}`。业务错误键：`wecomInvalidWebhook`、`wecomWebhookRequired`、`wecomSendFailed`。

配置保存于现有 KV 的 `setting:wecom`，默认 `{enabled:false, webhookUrl:''}`。不修改 D1，无数据库迁移、无新增依赖。完整地址仅由 Worker 从 KV 读取，不放进公开站点配置、前端持久化或 API 响应。KV 中的配置不是应用层加密数据。

本地验证入口：`mail-view/test/wecom-preview.html`，搭配 `test/wecom-preview.config.js`；该预览替换请求为内存模拟，不发送真实通知。
