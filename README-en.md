<div align="center">

# Xi-Mail

**Self-hosted mail service built entirely on Cloudflare**

A fork of [cloud-mail](https://github.com/eoao/cloud-mail) with a full UI redesign and a growing feature set

[![Version](https://img.shields.io/badge/Version-v3.4.0-6366f1)](https://github.com/PastKing/xi-mail/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat&color=6366f1)](https://github.com/PastKing/xi-mail/stargazers)
[![Telegram](https://img.shields.io/badge/Telegram-@pk__oa-26A5E4?logo=telegram)](https://t.me/pk_oa)

[简体中文](README.md) | [English](README-en.md)

</div>

With a single domain hosted on Cloudflare you can deploy a complete mail platform — multi-account, multi-domain, tiered permissions — at no cost. It runs on Workers + D1 + KV + R2, with no servers to maintain.

---

## 📸 Preview

| System settings | Appearance / themes |
|:---:|:---:|
| ![System settings](doc/images/system-setting-view.png) | ![Themes](doc/images/system-setting-theme.png) |
| **Analytics** | **Mailbox transfer** |
| ![Analytics](doc/images/analysis-view.png) | ![Transfer](doc/images/transfer-view.png) |

More screenshots in [doc/images/](doc/images/).

## 🔑 Live demo

Try it at [mail.azx.us](https://mail.azx.us) using invite code `viewUser` (limited to the `@nlfree.me` suffix). For preview only — do not store real mail there.

---

## ✨ Highlights

**Interface**
Six login templates and six color themes, plus three post-login layouts (full sidebar, icon-only sidebar, top navigation), all switchable from system settings and persisted server-side. Icons are unified on `mingcute`; the UI ships in English and Chinese, and the language preference follows the account across devices.

**Users and accounts**
User IDs are random alphanumeric strings and can be copied with one click. Each user can hold up to 100 mailbox accounts, and a deleted mailbox can be recreated. Mailboxes can be transferred to another user along with all their mail, subject to the recipient's approval. Roles carry a `level` field, so a user can only issue invite codes for roles below their own.

**Delivery control**
Sender-domain filtering runs in either blacklist or whitelist mode; in whitelist mode only authorized providers are accepted. Both the SMTP envelope sender and the header `From` address are checked, with subdomain matching. There is also an address keyword blacklist and configurable invite-code hints and links (separately for English and Chinese).

**Domain management**
No need to edit `wrangler.toml` — add, remove, enable and disable domains directly in system settings, and reorder them by dragging or with the up/down buttons. That order is exactly the order of mailbox suffixes on the registration page, with the first entry as the default.

**Deployment shapes**
Deploy the frontend and Worker together, or run `build:standalone` to produce a static frontend for CF Pages, Vercel or any static host. The frontend can connect to several Worker instances at once and aggregate their data, and `mail-worker-sub/` provides a lightweight sub-worker template that only receives mail and serves the API — no user system, no pages.

**Admin API**
Generate a global API token and query mail without logging in via the `x-admin-auth` header:

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

---

## 🚀 Deployment

Prerequisites: Node.js ≥ 20, `npx wrangler login` completed, and a domain hosted on Cloudflare with Email Routing enabled.

```bash
git clone https://github.com/PastKing/xi-mail.git
cd xi-mail/mail-worker && npm install

# Create Cloudflare resources and note the returned IDs
npx wrangler d1 create xi-mail
npx wrangler kv namespace create kv
npx wrangler r2 bucket create xi-mail

# Fill in the configuration
cp wrangler.example.toml wrangler.toml

# Build the frontend and deploy
cd ../mail-view && npm install && npm run build
cd ../mail-worker && npx wrangler deploy
```

After deploying, visit `https://your-worker.workers.dev/api/init/<JWT_SECRET>` to initialize or migrate the database schema.

Key `wrangler.toml` fields:

```toml
[vars]
domain      = ["mail.example.com"]   # Domain list; may be left empty once domains are managed in system settings
admin       = "admin@example.com"    # Admin address, immutable after initialization
jwt_secret  = "your-secret"          # JWT secret, at least 32 random characters
```

### Standalone frontend

```bash
cd mail-view
VITE_BASE_URL=https://your-worker.workers.dev/api npm run build:standalone
# Deploy dist/ to CF Pages, Vercel or any static host
```

Without `VITE_BASE_URL`, the first visit redirects to `/setup` so the Worker address can be entered manually.

For a more detailed walkthrough, see the upstream [cloud-mail docs](https://github.com/eoao/cloud-mail).

---

## 📋 Release history

Versions follow `3.x.y`, where `x` is a small feature and `y` is a fix or refinement. The full changelog lives in `git.md` inside the repository.

| Version | Summary |
|---------|---------|
| **v3.4.0** | Domain management became an inline, sortable panel; system settings split into `/system-setting/:section` sub-routes so a refresh keeps you on the current section |
| **v3.3.x** | Sender whitelist mode; blacklist and whitelist merged into one entry point; `/settings` reordered with click-to-copy IDs; icon set and sizes unified |
| **v3.2.x** | Sender-domain blocking fixed (envelope + header `From`); sidebar narrowed to 200px |
| **v3.1.0** | Sub-worker aggregation; language preference persisted to the user account |
| **v3.0.0** | Frontend/backend split; multi-server architecture; standalone deployment |
| **v2.0.0** | Appearance template system; switchable post-login layout; system settings rewrite |

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

[GitHub](https://github.com/PastKing/xi-mail) · [Telegram @pk_oa](https://t.me/pk_oa) · upstream [eoao/cloud-mail](https://github.com/eoao/cloud-mail)

If this project helps you, USDT donations are welcome:

| Network | Address |
|---------|---------|
| BEP20 (BSC) | `0x555390f5c07cf76cc344f42612196e8669e3586b` |
| TRC20 (TRON) | `TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G` |

---

## 📄 License

[MIT License](LICENSE). The upstream project [eoao/cloud-mail](https://github.com/eoao/cloud-mail) is also MIT licensed, and its original copyright notice is preserved here.
