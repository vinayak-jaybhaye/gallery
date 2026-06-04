# Gallery — Developer Documentation

Documentation for the Gallery monorepo. It describes **what the code does today**, not planned features.

## Audience

- Backend and frontend developers onboarding to the repo
- Anyone debugging uploads, media processing, or sharing flows

## Documentation map

| Section | Topics |
|---------|--------|
| [01 — Overview](./01-overview/system-architecture.md) | System context, services, diagrams |
| [01 — Getting started](./01-overview/getting-started.md) | Local setup, scripts, first run |
| [02 — Infrastructure](./02-infrastructure/docker-and-environment.md) | Docker, env vars, LocalStack |
| [03 — Packages](./03-packages/README.md) | `@gallery/db`, `@gallery/s3`, `@gallery/queue` |
| [04 — API](./04-api/README.md) | Express app, routes, auth, errors |
| [05 — Web](./05-web/README.md) | React app, routing, uploads, workers |
| [06 — Media worker](./06-media-worker/README.md) | BullMQ consumer, image/video processing |
| [07 — Data model](./07-data-model/schema.md) | Prisma schema, statuses, S3 keys |

## Repository layout

```text
gallery/
  apps/
    api/            Express 5 API
    web/            React 19 + Vite frontend
    media-worker/   Background processor (Sharp, FFmpeg)
    docs/           This documentation
  packages/
    db/             Prisma schema, migrations, client factory
    s3/             AWS S3 client factory
    queue/          Redis + BullMQ media processing queue
  docker-compose.yml
  .env              Root env (API + worker via dotenv-cli; web VITE_* via vite envDir)
  package.json      Workspace scripts
```

## Quick reference

| Service | Default URL | Requires |
|---------|-------------|----------|
| Web | http://localhost:5173 | `VITE_GOOGLE_CLIENT_ID` (Google sign-in) |
| API | http://localhost:3000 | Postgres, S3, `JWT_SECRET` |
| Media worker | (no HTTP) | Postgres, S3, `REDIS_URL` |
| Postgres | localhost:5432 | Docker `gallery-db` |
| Redis | localhost:6379 | Docker `gallery-redis` |
| LocalStack S3 | localhost:4566 | Docker `gallery-localstack` |

Run everything locally:

```bash
cp .env.sample .env   # then edit secrets
pnpm install
pnpm db:generate      # required before first API/worker start
pnpm dev              # docker:up + migrate + api + web + worker
```

## Conventions used in this codebase

- **pnpm workspaces** — apps depend on packages via `workspace:*`
- **Zod** — API request validation (`validate` middleware + per-route schemas)
- **JWT bearer auth** — `Authorization: Bearer <token>` on protected routes; token stored in browser `localStorage`
- **Cursor pagination** — base64url-encoded `{ time, id }` cursors for list endpoints
- **Direct-to-S3 uploads** — API issues presigned URLs; browser uploads bytes to S3

## Known gaps (implemented behavior)

Documented honestly in [system architecture](./01-overview/system-architecture.md#known-gaps):

- `/favorites` UI route has no backend favorites model
- No `failed` media status when processing fails after BullMQ retries
- Upload session cleanup for expired rows is not automated
- `DEV_USER_EMAIL` bypasses password check in development only
