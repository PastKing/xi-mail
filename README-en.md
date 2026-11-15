<div align="center">

<img src="mail-view/public/brand/icon.svg" width="64" height="64" alt="Xi-Mail" />

# Xi-Mail

**Self-hosted mail service built entirely on Cloudflare**

A fork of [cloud-mail](https://github.com/maillab/cloud-mail) with a full UI redesign and a growing feature set

[![Version](https://img.shields.io/badge/Version-v3.6.13-6366f1)](https://github.com/PastKing/xi-mail/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat&color=6366f1)](https://github.com/PastKing/xi-mail/stargazers)
[![Telegram](https://img.shields.io/badge/Telegram-@pk__oa-26A5E4?logo=telegram)](https://t.me/pk_oa)

[简体中文](README.md) | [繁體中文](README-zh-TW.md) | [English](README-en.md)

</div>

With a single domain hosted on Cloudflare you can deploy a complete mail platform — multi-account, multi-domain, tiered permissions — at no cost. It runs on Workers + D1 + KV + R2, with no servers to maintain.

---

## 📸 Preview

| Login template | Floating Island |
|:---:|:---:|
| ![Editorial login template](doc/images/template/Editorial.png) | ![Floating Island navigation](doc/images/layout/FloatingIsland.png) |
| **Domain management** | **Analytics** |
| ![Domain management](doc/images/system-setting-domain.png) | ![Analytics](doc/images/analysis.png) |

More templates, layouts and feature screenshots: [Screenshots](doc/PREVIEW-en.md).

## 🔑 Live demo

Register at [mail.azx.us](https://mail.azx.us) using invite code `viewUser`.

---

## ✨ Highlights

- **Mail**: multiple mailboxes, compose and reply, code extraction; Resend, QueenSMTP, SendFlare and Cloudflare Email sending.
- **Domains and filtering**: manage domains in the dashboard, with sender allowlists, blocklists and keyword filters.
- **Users and permissions**: tiered roles, invitation codes, mailbox transfers, expiring inbox-sharing links and session management.
- **Provider sign-in**: connect NodeLoc, Telegram, Discord, GitHub, Google or LinuxDo to an existing mailbox.
- **Appearance**: six login templates, six color themes and four navigation layouts, with mobile support and English/Chinese UI.
- **Flexible deployment**: deploy together or with a standalone frontend; connect multiple Workers and receiving sub-workers.
- **API integration**: query mail with a global API token for use in other tools.

Setup instructions and request examples: [OAuth and API integration](doc/INTEGRATIONS-en.md).

---

## 🧩 Browser extension

A companion Chrome extension for reading mail, copying verification codes, writing mail and managing mailboxes without opening the website.

| Inbox | Reading | Dark · switch mailbox |
|:---:|:---:|:---:|
| ![Extension inbox](doc/images/plug-in/inbox.png) | ![Extension reader](doc/images/plug-in/reader.png) | ![Extension dark mode](doc/images/plug-in/mailbox-dropdown-dark.png) |

- Inbox, sent, compose and reply; verification codes shown in the list with one-click copy
- Switch, create and delete mailboxes; multiple accounts stay separate
- Draggable floating button on the right edge of any page that opens the full mailbox window
- New mail notifications; light / dark / follow system
- Passwords are never stored and the login token is encrypted locally; mail bodies render in a sandbox with remote images blocked

**Install**: download [`doc/plug-in/chrome-plug.zip`](doc/plug-in/chrome-plug.zip) and unzip it → open `chrome://extensions` and turn on Developer mode → click "Load unpacked" and pick the unzipped folder → click the Xi-Mail toolbar icon and sign in with your site URL (e.g. `https://mail.example.com`), email and password.

Requires Chrome 120 or later. Attachments cannot be sent yet; actions that need a CAPTCHA (such as some mailbox creation) should be done on the website.

---

## 🚀 Deployment

See the [Xi-Mail deployment guide](https://xi-mail-docs.azx.us/guide/deploy) for Cloudflare dashboard setup, CLI deployment, first-time initialization, receiving domains, and project updates.

---

## 🛠️ Stack and layout

Backend: Cloudflare Workers with Hono, Drizzle ORM and D1 / KV / R2. Frontend: Vue 3, Vite, Element Plus, Pinia, TailwindCSS 4 and vue-i18n.

```
xi-mail/
├── mail-worker/       # Main worker: API, business logic, auth, migrations
├── mail-view/         # Vue 3 frontend: layout, pages, login templates, themes, i18n
├── mail-worker-sub/   # Sub-worker template: mail receiving + API, with its own docs
└── doc/images/        # Screenshots
```

---

## 💬 Community and support

[GitHub](https://github.com/PastKing/xi-mail) · [Telegram @pk_oa](https://t.me/pk_oa) · upstream [maillab/cloud-mail](https://github.com/maillab/cloud-mail)

If this project helps you, USDT donations are welcome:

| Network | Address |
|---------|---------|
| BEP20 (BSC) | `0x555390f5c07cf76cc344f42612196e8669e3586b` |
| TRC20 (TRON) | `TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G` |

---

## 📄 License

[MIT License](LICENSE). The upstream project [maillab/cloud-mail](https://github.com/maillab/cloud-mail) is also MIT licensed, and its original copyright notice is preserved here.
