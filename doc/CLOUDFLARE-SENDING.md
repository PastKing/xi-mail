# Cloudflare 原生发信渠道

系统设置 → 邮箱地址 → 发信渠道，可按发件域名选择 Resend 或 Cloudflare Email Sending。没有保存过选择的域名继续使用 Resend，原有 Token 无须迁移。

## Cloudflare 侧准备

1. 确认账户可使用 Email Sending。向任意外部邮箱发送需要 Workers Paid 套餐；仅向账户内已验证的目标地址发送可使用免费套餐。具体计费以 [官方定价](https://developers.cloudflare.com/email-service/platform/pricing/) 为准。
2. 在 Cloudflare → Compute → Email Service → Email Sending 中开通相应发件域名，并按控制台指引完成 DNS 和域名验证。现有收件 Email Routing 无须在本项目中改写。
3. 在实际生产使用的 Wrangler 配置的顶层添加绑定（放在 `[vars]` 等表之前）：

   ```toml
   [[send_email]]
   name = "EMAIL"
   ```

   `wrangler.example.toml` 和 `wrangler-action.toml` 已包含绑定。若生产使用另外生成的配置文件，也必须加入同名绑定。此绑定直接使用 Worker 所属账户的服务，后台不用保存 Cloudflare API Token。配置未限定收件人；使用受到 Cloudflare 账户、域名及套餐的限制。
4. 部署带绑定的 Worker 后，在后台选择相应域名的 Cloudflare 渠道并保存。界面的“绑定已配置”仅说明 Worker 有 EMAIL 绑定，不代表域名已通过验证或套餐已开通。
5. 使用本人指定的测试收件地址进行真实发信验收，检查正文、多收件人、附件及回复；最终结果在 Cloudflare 发信日志中确认。

## 行为与限制

- 普通用户无需选择渠道；原有邮箱归属、角色域名权限、发信开关和次数限制继续生效。
- 全部收件人是站内邮箱时继续本地投递；有站外收件人时，全部收件人通过所选渠道发送。
- 原生绑定使用结构化发送接口，保留发件人名字、纯文本/HTML、多收件人、回复头、普通附件和 CID 内嵌图片。最多 50 个收件人；通常总邮件大小含附件不超过 5 MiB，Cloudflare 对已验证目标地址另有大小限额。以 [官方限制](https://developers.cloudflare.com/email-service/platform/limits/) 为准。
- 发送接口成功代表 Cloudflare 接受请求，项目记录为“已发送”，不冒充最终送达。本版没有接入 Cloudflare Event Subscriptions/Queues 的投递、退信事件；最终状态先通过 Cloudflare 发信日志确认。Resend 现有状态回调继续工作。
- 不自动备用重发。特别是超时或缺少返回 ID 时，先查服务商日志，以免重复投递。
- 选择信息保存在既有 KV 的 `setting:send_channels`，不增加 D1 字段或迁移历史记录；跨节点生效时间受 KV 传播影响。修改需要原有 `setting:set` 权限，公共网站配置不返回渠道配置。
- Cloudflare 跟踪 ID 使用 `cloudflare:<messageId>` 保存到既有跟踪字段；历史 Resend ID 保持原值。Cloudflare 跟踪 ID 不当作 RFC Message-ID 用于回复，也不接受 Resend 回调更新。

## 验证命令

在 `mail-worker`：

```powershell
node node_modules/vitest/vitest.mjs run --config vitest.node.config.js test/unit/send-channel-service.spec.js test/unit/send-channel-settings.spec.js test/unit/resend-token-access.spec.js
```

在 `mail-view`：

```powershell
node --test test/resend-token-edit.test.mjs test/recipients.test.mjs
pnpm build
```

实现依据：[Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)、[域名开通](https://developers.cloudflare.com/email-service/get-started/send-emails/)、[回复头](https://developers.cloudflare.com/email-service/reference/headers/)、[事件订阅](https://developers.cloudflare.com/email-service/platform/event-subscriptions/)。
