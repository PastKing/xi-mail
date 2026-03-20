# Xi Mail

A self-hosted Cloudflare email service, forked from [Cloud Mail](https://github.com/eoao/cloud-mail) with a complete UI redesign and feature extensions.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/PastKing/xi-mail?style=flat)](https://github.com/PastKing/xi-mail/stargazers)

[简体中文](README.md) | English

---

## Introduction

Xi Mail is a self-hosted email service built on the Cloudflare stack (Workers / D1 / KV / R2). With just one domain, you can run a full-featured email platform supporting multiple accounts, multiple domains, and role-based access control.

> Upstream project: [maillab/cloud-mail](https://github.com/eoao/cloud-mail)
> This project builds upon the upstream with a redesigned UI and extended features. Thanks to the original authors for their open-source contribution.

---

## What's New / Changed

### Complete UI Redesign (Linear-inspired)
- Built with **TailwindCSS 4** + **@vueuse/motion** animation library
- Login / Register: frosted glass card, animated gradient orbs, subtle grid background
- Sidebar: dark minimal style with unified navigation icons
- Header: compact layout, gradient Compose button, improved user info panel
- Global design tokens: Linear-style indigo-violet gradients, colored shadows, unified border-radius

### User System Enhancements
- **Display ID**: User IDs are now random alphanumeric strings (`xxxx-xxxx-xxxx`) instead of sequential numbers
- Display ID shown in: user detail panel, personal settings, avatar hover card in header
- **Account Transfer**: Users can transfer an email account (along with all its emails) to another user by Display ID; the recipient can accept or reject

### Account Management Improvements
- Inbox / Sent sidebar account list: search/filter support, shows full email address for easy multi-account distinction
- Account actions dropdown always visible (includes Transfer entry)

### Transfer Page (`/transfer`)
- Dedicated sidebar page to initiate transfers and manage pending/sent transfer requests
- Header badge shows real-time pending count

### Permission System Redesign
- Roles now have a `level` field (higher value = higher privilege)
- Users can only generate invite codes for roles with a lower level than their own
- Level constraint enforced at invite code creation

### Batch Operations (User Management)
- Batch ban, batch unban, batch delete

### System Settings Enhancements
- Email address keyword blocklist (admin can bypass; prevents regular users from registering emails containing sensitive words like `admin`)
- Removed redundant "Login Background" and "Login Opacity" settings
- Domain mapping UI improvement (existing system domains shown for quick selection)
- Auto-ban months input alignment fix

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Web Framework | Hono |
| ORM | Drizzle ORM |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| File Storage | Cloudflare R2 |
| Frontend | Vue 3 + Vite |
| UI Components | Element Plus |
| CSS Utility | TailwindCSS 4 |
| Animation | @vueuse/motion |
| State Management | Pinia |
| Router | Vue Router |
| i18n | vue-i18n |

---

## Project Structure

```
xi-mail
├── mail-worker          # Cloudflare Worker backend
│   ├── src
│   │   ├── api          # Route handlers
│   │   ├── dao          # Data access layer
│   │   ├── service      # Business logic
│   │   ├── entity       # Database entities
│   │   ├── security     # Auth & permissions
│   │   └── index.js     # Entry point
│   └── wrangler.toml    # Cloudflare deployment config
│
└── mail-view            # Vue 3 frontend
    ├── src
    │   ├── layout       # Layout components (sidebar / header / account panel)
    │   ├── views        # Page components
    │   ├── components   # Shared components
    │   ├── store        # Pinia stores
    │   ├── i18n         # Internationalization (zh / en)
    │   └── style.css    # Global styles / design tokens
    └── vite.config.js
```

---

## Quick Deploy

### Prerequisites

- Node.js >= 20
- Logged in to Cloudflare (`npx wrangler login`)
- A domain managed by Cloudflare

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/PastKing/xi-mail.git
cd xi-mail

# 2. Install backend dependencies
cd mail-worker
npm install

# 3. Create D1 database
npx wrangler d1 create xi-mail

# 4. Create KV namespace
npx wrangler kv namespace create kv

# 5. Create R2 bucket
npx wrangler r2 bucket create xi-mail

# 6. Edit wrangler.toml — fill in the IDs from steps 3-5,
#    your domain list, admin email, and JWT secret

# 7. Initialize the database
npx wrangler d1 execute xi-mail --remote --file=./src/db/schema.sql

# 8. Build the frontend
cd ../mail-view
npm install
npm run build

# 9. Deploy
cd ../mail-worker
npx wrangler deploy
```

For detailed deployment instructions, refer to the upstream project: [Deployment Docs](https://github.com/eoao/cloud-mail)

---

## License

This project is open-source under the [MIT License](LICENSE).

The upstream project [maillab/cloud-mail](https://github.com/eoao/cloud-mail) is also MIT licensed. Original copyright notices are retained.

---

## Credits

- [maillab/cloud-mail](https://github.com/eoao/cloud-mail) — the excellent open-source foundation this project is built on
- [Cloudflare](https://cloudflare.com) — for the powerful edge computing platform
