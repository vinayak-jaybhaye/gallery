# Docker and Environment

## Docker Compose services

Defined in `docker-compose.yml` at repo root.

| Service | Container | Image | Port | Role |
|---------|-----------|-------|------|------|
| `db` | `gallery-db` | `postgres:16` | 5432 | Primary database `gallery` |
| `db-migrate` | `gallery-db-migrate` | `node:20-alpine` | — | Runs `prisma migrate deploy` once after DB healthy |
| `redis` | `gallery-redis` | `redis:7-alpine` | 6379 | BullMQ backend |
| `localstack` | `gallery-localstack` | `localstack/localstack:3` | 4566 | S3-compatible API |

Volumes: `pgdata`, `localstack-data`.

**Not in Compose:** API, web, and media-worker run on the host via `pnpm dev:*`.

## LocalStack S3 bootstrap

`localstack-init.sh` is mounted into LocalStack `ready.d` hooks. It:

1. Creates bucket `gallery-bucket` (ignores error if exists)
2. Applies CORS allowing all origins/methods and exposes `ETag` (required for multipart uploads)

Dev `.env` typically sets:

```env
S3_ENDPOINT=http://localhost:4566
S3_BUCKET=gallery-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

## Environment file layout

| Location | Consumed by |
|----------|-------------|
| Root `.env` | `pnpm dev:api`, `pnpm dev:worker` via `dotenv-cli`; Prisma CLI via `dotenv -e .env` |
| Root `.env` (`VITE_*`) | Web via Vite `envDir: ../..` |
| `.env.sample` | Template for root `.env` |
| `apps/web/.env.sample` | Notes that root `.env` is preferred |
| `apps/media-worker/.env.sample` | Redundant copy of common vars |

There is no separate required `apps/api/.env` when using root `.env` and workspace scripts.

## Variable reference

### Core

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` enables `DEV_USER_EMAIL` login bypass |
| `DATABASE_URL` | Yes | PostgreSQL URL |
| `REDIS_URL` | Yes | Redis URL for BullMQ |
| `JWT_SECRET` | Yes | HS256 secret for API tokens |
| `JWT_EXPIRY` | No | Passed to `jsonwebtoken.sign` (default `1d`) |
| `PORT` | No | API port (default `3000`) |
| `FRONTEND_URL` | Yes | CORS `origin` in `app.ts` |

### Storage

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_BUCKET` | Yes | Target bucket name |
| `AWS_REGION` | Yes | AWS region (also used for LocalStack client) |
| `AWS_ACCESS_KEY_ID` | Yes | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | S3 credentials |
| `S3_ENDPOINT` | Dev | If set, enables path-style access (`@gallery/s3`) |

### Auth

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | For Google login | API verifies ID tokens |
| `GOOGLE_CLIENT_SECRET` | In sample | Not used by current API Google flow (ID token only) |
| `VITE_GOOGLE_CLIENT_ID` | For Google login | Web Google Sign-In button |
| `DEV_USER_EMAIL` | No | Dev-only passwordless credentials login |

### Worker

| Variable | Required | Description |
|----------|----------|-------------|
| `MEDIA_WORKER_CONCURRENCY` | No | BullMQ worker concurrency (default `5`) |

### Web-only

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Axios base URL (default `http://localhost:3000`) |

## Production notes

This repo is oriented toward local development. Production would need:

- Real S3 (omit `S3_ENDPOINT` or use AWS endpoint)
- Managed Postgres and Redis
- Secrets management (not committed `.env`)
- HTTPS and restricted CORS (`FRONTEND_URL` to real origin)
- FFmpeg installed on worker hosts
- One or more `media-worker` replicas sharing the same Redis queue
