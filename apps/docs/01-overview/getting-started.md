# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 10+ (`packageManager` in root `package.json`)
- Docker (for Postgres, Redis, LocalStack)
- FFmpeg on the host (media worker video processing uses `fluent-ffmpeg`, which shells out to `ffmpeg`)

## First-time setup

### 1. Environment

Copy the sample env and fill in values:

```bash
cp .env.sample .env
```

Required for a working dev stack:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | API, worker, Prisma CLI | PostgreSQL connection |
| `REDIS_URL` | API, worker | BullMQ queue (`redis://localhost:6379`) |
| `JWT_SECRET` | API | Sign/verify access tokens |
| `FRONTEND_URL` | API | CORS origin (e.g. `http://localhost:5173`) |
| `S3_BUCKET`, `AWS_*`, `S3_ENDPOINT` | API, worker | Object storage (LocalStack in dev) |
| `GOOGLE_CLIENT_ID` | API | Verify Google ID tokens |
| `VITE_GOOGLE_CLIENT_ID` | Web | Google Sign-In button (same client ID as above) |

Optional:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEV_USER_EMAIL` | — | In `NODE_ENV=development`, email/password login ignores credentials and logs in this user |
| `MEDIA_WORKER_CONCURRENCY` | `5` | Parallel BullMQ jobs per worker process |
| `JWT_EXPIRY` | `1d` | JWT lifetime |
| `PORT` | `3000` | API listen port |
| `VITE_API_URL` | `http://localhost:3000` | Web Axios base URL |

Web loads `VITE_*` from the **monorepo root** `.env` (`apps/web/vite.config.ts` sets `envDir` to `../..`).

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start infrastructure

```bash
pnpm docker:up
```

Starts:

- `gallery-db` — PostgreSQL 16 on `5432`
- `gallery-redis` — Redis 7 on `6379`
- `gallery-localstack` — S3 API on `4566`
- `gallery-db-migrate` — one-shot `prisma migrate deploy` (exits when done)

LocalStack runs `localstack-init.sh`, which creates `gallery-bucket` and sets permissive CORS for browser uploads.

### 4. Database client

Generate the Prisma client (required for API and worker):

```bash
pnpm db:generate
```

Apply migrations (also run automatically by `pnpm dev`):

```bash
pnpm db:migrate
```

### 5. Run applications

**All services:**

```bash
pnpm dev
```

Equivalent to: `docker:up` → `db:migrate` → `dev:services` (API + web + worker via `concurrently`).

**Individually:**

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:worker
```

### 6. Verify

- Web: http://localhost:5173
- API health: http://localhost:3000/health → `{ "status": "ok" }`
- Worker log: `Media worker started (Redis + BullMQ, concurrency=5)...`
- API startup log: database connected, S3 connection verified

## Workspace scripts

| Script | Command |
|--------|---------|
| `pnpm dev` | Full local stack |
| `pnpm dev:services` | API + web + worker only |
| `pnpm dev:api` | API with root `.env` |
| `pnpm dev:web` | Vite dev server |
| `pnpm dev:worker` | Media worker with root `.env` |
| `pnpm docker:up` / `docker:down` | Infrastructure |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:push` | `prisma db push` (prototyping) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm build` | Build all packages (`pnpm -r build`) |
