<div align="center">

# Xi-Mail

**Self-hosted temporary email service powered by the Cloudflare stack**

Forked from [cloud-mail](https://github.com/eoao/cloud-mail) · Complete UI redesign · Ongoing feature extensions

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/PastKing/xi-mail?color=6366f1)](https://github.com/PastKing/xi-mail/releases)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat&color=6366f1)](https://github.com/PastKing/xi-mail/stargazers)
[![Telegram](https://img.shields.io/badge/Telegram-@pk__oa-26A5E4?logo=telegram)](https://t.me/pk_oa)

[简体中文](README.md) | English

</div>

---

## 📖 Introduction

Xi-Mail is a full-stack self-hosted email service built on **Cloudflare Workers / D1 / KV / R2**, forked from [cloud-mail](https://github.com/eoao/cloud-mail) with a complete UI redesign and a series of new features.

With just a single domain managed by Cloudflare, you can deploy a full-featured email platform — completely free — supporting multiple accounts, multiple domains, and role-based access control.

---

## ✨ What's New

### 🎨 Complete UI Redesign (Linear-inspired)
- Rebuilt with **TailwindCSS 4** + **@vueuse/motion** animation library
- Login / Register: frosted glass card, animated gradient orbs, subtle grid background
- Sidebar: dark minimal style with unified navigation icons
- Header: compact layout, gradient Compose button, improved user info panel
- Global design tokens: indigo-violet gradients, colored shadows, unified border-radius

### 👤 User System Enhancements
- **Display ID**: User IDs are now random alphanumeric strings (`xxxx-xxxx-xxxx`) instead of sequential integers
- Display ID shown in: user detail panel, personal settings page, avatar hover card in header
- **Account Transfer**: Users can transfer an email account (along with all its emails) to another user by Display ID; the recipient can accept or reject

### 📬 Account Management Improvements
- Inbox / Sent sidebar: search/filter support, shows full email address for easy multi-account distinction
- Account actions dropdown always visible (includes Transfer entry)

### 🔄 Transfer Page (`/transfer`)
- Dedicated sidebar page to initiate transfers and manage pending / sent transfer requests
- Header badge shows real-time pending count

### 🛡️ Permission System Redesign
- Roles now have a `level` field (higher value = higher privilege)
- Users can only generate invite codes for roles with a **lower** level than their own
- Level constraint strictly enforced server-side at invite code creation

### 🗂️ Batch Operations (User Management)
- Batch ban, batch unban, batch delete selected users

### ⚙️ System Settings Enhancements
- **Global API Token**: Admins can enable and generate a global token; use the `x-admin-auth` header to query emails via API without login (`GET /api/admin/mails`)
- **Email keyword blocklist**: Prevents regular users from registering email addresses containing sensitive keywords like `admin` (admins can bypass)
- Domain mapping UI improvement: existing system domains shown for quick selection
- Auto-ban months input alignment fix; removed redundant "Login Background" and "Login Opacity" settings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Web Framework | Hono |
| ORM | Drizzle ORM |
| Database | Cloudflare D1 (SQLite) |
| Cache / Session | Cloudflare KV |
| File Storage | Cloudflare R2 |
| Frontend | Vue 3 + Vite |
| UI Components | Element Plus |
| CSS Utility | TailwindCSS 4 |
| Animation | @vueuse/motion |
| State Management | Pinia |
| Router | Vue Router |
| i18n | vue-i18n (zh / en) |

---

## 📁 Project Structure

```
xi-mail/
├── mail-worker/                 # Cloudflare Worker backend
│   ├── src/
│   │   ├── api/                 # Route handlers
│   │   ├── service/             # Business logic
│   │   ├── entity/              # Drizzle database entities
│   │   ├── security/            # JWT auth + permission middleware
│   │   ├── init/                # DB init / version migrations
│   │   └── index.js             # Worker entry point
│   └── wrangler.example.toml    # Config template (copy to wrangler.toml and fill in)
│
└── mail-view/                   # Vue 3 frontend
    ├── src/
    │   ├── layout/              # Layout components (sidebar / header / account panel)
    │   ├── views/               # Page components
    │   ├── components/          # Shared components
    │   ├── store/               # Pinia stores
    │   ├── i18n/                # i18n (zh / en)
    │   └── style.css            # Global styles / design tokens
    └── vite.config.js
```

---

## 🚀 Quick Deploy

### Prerequisites

- Node.js ≥ 20
- Logged in to Cloudflare: `npx wrangler login`
- A domain managed by Cloudflare with Email Routing configured

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/PastKing/xi-mail.git
cd xi-mail/mail-worker

# 2. Install dependencies
npm install

# 3. Create Cloudflare resources
npx wrangler d1 create xi-mail          # note the database_id
npx wrangler kv namespace create kv     # note the id
npx wrangler r2 bucket create xi-mail

# 4. Configure wrangler.toml
cp wrangler.example.toml wrangler.toml
# Edit wrangler.toml — fill in the IDs from step 3, domain list, admin email, JWT secret

# 5. Build the frontend
cd ../mail-view
npm install
npm run build

# 6. Deploy
cd ../mail-worker
npx wrangler deploy

# 7. Initialize the database (first deployment only)
# Visit in browser: https://your-worker.workers.dev/api/init/<JWT_SECRET>
```

### Key wrangler.toml fields

```toml
[vars]
domain      = ["mail.example.com"]   # Email domain list (JSON array)
admin       = "admin@example.com"    # Admin email (cannot be changed after init)
jwt_secret  = "your-secret"          # JWT signing key (min 32 random characters)
```

> For detailed deployment instructions, refer to the upstream project: [cloud-mail docs](https://github.com/eoao/cloud-mail)

---

## 📡 Global API Token

Enable and generate a token in **System Settings → Security → Global API Token**, then query emails without login:

```http
GET /api/admin/mails?limit=20&offset=0&address=user@domain.com
x-admin-auth: <your-token>
```

Response format:

```json
{
  "results": [...],
  "count": 100
}
```

---

## 💬 Community & Support

| Channel | Link |
|---------|------|
| GitHub | [PastKing/xi-mail](https://github.com/PastKing/xi-mail) |
| Telegram Channel | [@pk_oa](https://t.me/pk_oa) |
| Upstream Project | [eoao/cloud-mail](https://github.com/eoao/cloud-mail) |

### Donate (USDT)

If this project helps you, consider supporting ongoing development:

| Network | Address |
|---------|---------|
| BEP20 (BSC) | `0x555390f5c07cf76cc344f42612196e8669e3586b` |
| TRC20 (TRON) | `TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G` |

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

The upstream project [eoao/cloud-mail](https://github.com/eoao/cloud-mail) is also MIT licensed. Original copyright notices are retained.
