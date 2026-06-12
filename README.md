# CarDesk

Automotive Dealership Management System — production-ready, phased build.

**Stack:** Next.js 15 · TypeScript · TailwindCSS v4 · shadcn/ui · Prisma ORM · PostgreSQL · Auth.js v5 · next-intl · PWA

---

## Phase 1 — Foundation ✅

- Next.js 15 App Router
- PostgreSQL + Prisma (User model, Role enum)
- Auth.js v5 — Credentials provider, JWT sessions
- Role-based access: `ADMIN` / `EMPLOYEE`
- Protected routes middleware (locale-aware)
- i18n: English + Slovenian (`/en`, `/sl`)
- shadcn/ui + Tailwind CSS v4
- PWA manifest

---

## Native Install (recommended)

### Prerequisites

- Ubuntu 20.04 / 22.04 / 24.04 or Debian 11 / 12
- Root / sudo access

Everything else (Node.js 20, PostgreSQL 16) is installed automatically.

### Install

```bash
git clone <repo>
cd cardesk
sudo bash install.sh
```

The script will:
1. Install Node.js 20 (via NodeSource)
2. Install PostgreSQL 16 (via postgresql.org apt repo)
3. Create a PostgreSQL user and database
4. Prompt for app URL and port
5. Generate `.env.local` and `AUTH_SECRET` automatically
6. Install dependencies, run migrations, seed users
7. Build the app
8. Install and start a systemd service (`cardesk`)

### Update

```bash
sudo bash update.sh
```

Pulls latest code, runs any new migrations, rebuilds, restarts the service.

---

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/en/dashboard`.

---

## Default Credentials (seed)

| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Admin    | admin@cardesk.com       | Admin@123     |
| Employee | employee@cardesk.com    | Employee@123  |

> Change these in production.

---

## Docker (optional)

Docker Compose files are included if you prefer containerised deployment.

```bash
# Production (app + db)
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed

# DB only (for local dev with native Node)
docker compose -f docker-compose.dev.yml up -d
```

---

## Folder Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/login/
│   │   └── (protected)/dashboard, profile, settings/
│   └── api/auth/
├── components/
│   ├── ui/          # shadcn/ui components
│   └── layout/      # Sidebar, Header
├── lib/             # prisma.ts, auth.ts, utils.ts
├── modules/         # Feature modules (Phase 2+)
├── i18n/            # next-intl config
└── types/           # next-auth type extensions
messages/            # en.json, sl.json
prisma/
├── schema.prisma
└── seed.ts
```

---

## Environment Variables

| Variable               | Required | Description                         |
|------------------------|----------|-------------------------------------|
| `DATABASE_URL`         | ✅       | PostgreSQL connection string         |
| `AUTH_SECRET`          | ✅       | Random secret — `openssl rand -base64 32` |
| `AUTH_URL`             | ✅       | Full app URL (e.g. `https://...`)    |
| `NEXT_PUBLIC_APP_URL`  | ✅       | Public app URL                       |

---

## Scripts

```bash
npm run dev                 # Development server
npm run build               # Production build
npm run start               # Start production server
npm run db:migrate          # Run migrations (dev, creates migration files)
npm run db:migrate:deploy   # Run migrations (production, no file creation)
npm run db:seed             # Seed admin + employee users
npm run db:studio           # Prisma Studio GUI
npm run db:generate         # Regenerate Prisma client
```
