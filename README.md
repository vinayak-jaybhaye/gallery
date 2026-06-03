# Gallery Monorepo

A pnpm monorepo for a photo/video gallery with direct-to-S3 uploads and background media processing.

## Documentation

**Developer documentation:** [apps/docs/README.md](./apps/docs/README.md)

Covers architecture, local setup, API routes, web upload pipeline, BullMQ worker, and the Prisma data model.

## Structure

```
gallery/
├── apps/
│   ├── api/              # Express API (auth, uploads, media, albums)
│   ├── web/              # React + Vite frontend
│   ├── media-worker/     # BullMQ consumer (Sharp + FFmpeg)
│   └── docs/             # Developer documentation
├── packages/
│   ├── db/               # Prisma + PostgreSQL
│   ├── s3/               # AWS S3 client factory
│   └── queue/            # Redis + BullMQ
├── docker-compose.yml
└── package.json
```

## Quick start

```bash
cp .env.sample .env
pnpm install
pnpm db:generate
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:3000/health  

See [getting started](./apps/docs/01-overview/getting-started.md) for env vars and troubleshooting.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Docker up + migrate + api + web + worker |
| `pnpm dev:api` | API only |
| `pnpm dev:web` | Web only |
| `pnpm dev:worker` | Media worker only |
| `pnpm docker:up` | Postgres, Redis, LocalStack |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Prisma Studio |

## Shared packages

| Package | Description |
|---------|-------------|
| `@gallery/db` | [docs](./apps/docs/03-packages/db.md) |
| `@gallery/s3` | [docs](./apps/docs/03-packages/s3.md) |
| `@gallery/queue` | [docs](./apps/docs/03-packages/queue.md) |
