# Gallery Monorepo

A pnpm monorepo with three applications and two shared packages.

## Structure

```
gallery/
├── apps/
│   ├── api/              # API server (Express + TypeScript)
│   ├── web/              # Web frontend (React + Vite)
│   └── media-worker/     # Background worker
├── packages/
│   ├── db/               # Database client (Prisma + PostgreSQL)
│   └── s3/               # S3 storage client (AWS SDK)
├── docker-compose.yml    # Local dev infrastructure
└── package.json
```

## Getting Started

### 1. Start local infrastructure

```bash
pnpm docker:up    # Starts PostgreSQL and LocalStack (S3)
```

### 2. Setup database

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
```

### 3. Run development servers

```bash
pnpm dev:api      # Start API server on :3000
pnpm dev:web      # Start web dev server on :5173
pnpm dev:worker   # Start media worker
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | Start API development server |
| `pnpm dev:web` | Start web development server |
| `pnpm dev:worker` | Start media worker |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:up` | Start Docker containers |
| `pnpm docker:down` | Stop Docker containers |

## Shared Packages

### @gallery/db

Database client using Prisma with PostgreSQL.

```typescript
import { createPrismaClient } from "@gallery/db";

const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL,
});
```

### @gallery/s3

S3 storage client using AWS SDK.

```typescript
import { createS3Client, PutObjectCommand } from "@gallery/s3";

const s3 = createS3Client({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT, // Optional for LocalStack
});
```

## Environment Variables

Copy `.env` files from the apps for local development:

- `apps/api/.env` - API server configuration
- `apps/web/.env` - Web client configuration
- `packages/db/.env` - Database connection string
