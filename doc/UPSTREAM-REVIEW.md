# 上游更新对照：2026-11-06

参考 [maillab/cloud-mail](https://github.com/maillab/cloud-mail)，本轮克隆核对至 `d115f4c`（2026-10-25）。本项目文档的旧上游地址已同步更新。以下结论来自提交差异和本地实现对照。

| 上游更新 | 具体做了什么 | Xi-Mail 处理 |
|---|---|---|
| [权限修复](https://github.com/maillab/cloud-mail/commit/8b563c50d6bfd889dc4a0305f47e3000c217c204) | 为恢复用户、修改黑名单补齐权限路径 | 已覆盖。继续保留精确权限匹配，以及邮箱转移、OAuth 管理和收件箱分享权限 |
| [隐藏登录域名](https://github.com/maillab/cloud-mail/commit/82d16947817d9592af5cee837c77f6c91c31d848) | 登录与注册使用完整邮箱，隐藏后缀列表 | 补齐公开配置接口隐藏；已登录用户从经过会话鉴权的个人信息接口取得后缀列表 |
| [OAuth 支持](https://github.com/maillab/cloud-mail/commit/f9ddd7b) | 支持 GitHub、Google 等身份来源 | 接入现有统一 OAuth 系统，保留先注册、再绑定的规则；客户端密钥仅在服务端保存 |
| [高级邮件搜索](https://github.com/maillab/cloud-mail/commit/9549a92e6e83fc0f4141c71159091bcbe3282030) | 关键词、字段和日期筛选 | 收件箱及已发送增加搜索；列表、计数、分页和新邮件轮询使用相同筛选条件 |
| [数据库读取优化](https://github.com/maillab/cloud-mail/commit/a8c9ae3d81d401536805ea291d3a454a9453e1c4) | 按原始时间范围筛选，减少按函数逐行计算 | 统计查询改用 UTC 起止时间范围，补充组合索引；同时修正负数和半小时时区偏移 |
| [列表索引优化](https://github.com/maillab/cloud-mail/commit/9aa350e173e646d0d50ef36ff5c73e67a5e3447d) | 调整索引和查询条件配合 | 补齐个人、后台和状态待处理查询索引；滚动分页可跳过总数与最新邮件标记查询 |
| [DOMPurify 清洗](https://github.com/maillab/cloud-mail/commit/c19bd0a) | 清理邮件 HTML，降低 XSS 风险 | 已覆盖，继续保留 DOMPurify、无脚本 iframe、CSP 和附件响应策略，不替换成较弱的渲染方式 |
| [异常状态导致列表空白](https://github.com/maillab/cloud-mail/commit/2dbda16101703c0c440cff75eb7db2b153ff2c0c) | 对未识别的邮件状态提供显示回退 | 补齐通用状态图标，历史异常状态不会使整份列表渲染失败 |
| 菜单与字体 | 上游调整了侧栏背景、字体和留白 | 沿用 Xi-Mail 已有四套导航及统一设置字号；新增搜索和五种登录入口适配手机，不覆盖既有登录模板设计 |

本轮还核对了上游的注册码并发、退出缓存及摘要处理：

- 注册账号、创建主邮箱与扣减邀请码次数在同一 D1 事务中完成；失败不留下孤立用户或消耗次数。可选注册码并发耗尽时重新按默认角色校验。
- 列表只返回最多 300 字的纯文本摘要，阅读、回复时仍从原接口获取完整正文。HTML-only 邮件也不会把整篇 HTML 带到列表响应。
- 退出时清理邮件正文、收件人历史和待完成 OAuth 状态，再重载页面，释放旧用户页面缓存。
- GitHub 使用授权码与 PKCE，并从受认证的 `/user` 接口取得稳定 ID；Google 使用经过签名、issuer、audience、时效及 nonce 校验的 `sub`。均不按第三方邮箱自动注册或自动绑定。

OAuth 实现同时参考 [GitHub 官方文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) 与 [Google OpenID Connect 文档](https://developers.google.com/identity/openid-connect/openid-connect)。没有新建真实第三方应用，也没有改变现有应用凭据；管理员完成配置后才会显示新的登录入口。

验证：350 项后端测试及中英文、桌面和手机端浏览器检查通过。生产 D1 的最近 15 天收信统计（UTC+8）在索引迁移前后逐日结果一致；原查询读取 17,419 行，新查询读取 3,871 行，减少约 77.8%，查询计划命中 `idx_email_type_time`。这仅是该统计查询的实测，不代表所有列表或数据库请求的降幅；验证只读取聚合数据并添加索引，没有读取邮件正文。
