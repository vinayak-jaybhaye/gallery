# @gallery/db

**Path:** `packages/db`

## Responsibilities

- Prisma schema (`prisma/schema.prisma`)
- SQL migrations (`prisma/migrations/`)
- Generated client output (`src/generated/prisma/`)
- `createPrismaClient()` factory using `@prisma/adapter-pg`

## Usage

```typescript
import { createPrismaClient, PrismaClient } from "@gallery/db";

const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL!,
});
```

Apps instantiate once in `lib/prisma.ts` and export a singleton.

## Scripts (from repo root)

| Command | Runs |
|---------|------|
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:push` | `prisma db push` |
| `pnpm db:studio` | `prisma studio` |

All use `dotenv -e .env` for `DATABASE_URL`.

## Prisma 7 configuration

- `prisma.config.ts` at package root (not documented here line-by-line; see file for datasource URL)
- Client generator output: `src/generated/prisma`
- Preview feature: `partialIndexes` (used for trash queries on `Media`)

Media processing jobs are enqueued via `@gallery/queue` (Redis + BullMQ), not from this package.

## Migrations

Migrations are applied:

- Locally via `pnpm db:migrate` or `pnpm dev` (which runs migrate)
- In Docker via `db-migrate` service (`prisma migrate deploy`)

Do not edit applied migration SQL in place; add new migrations for schema changes.
