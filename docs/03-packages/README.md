# Shared Packages

Workspace packages under `packages/` are imported as `@gallery/<name>`.

## Package index

| Package | Path | Purpose |
|---------|------|---------|
| [@gallery/db](./db.md) | `packages/db` | Prisma client, schema, migrations |
| [@gallery/s3](./s3.md) | `packages/s3` | S3 client factory + SDK re-exports |
| [@gallery/queue](./queue.md) | `packages/queue` | BullMQ media processing queue |

Apps depend on these via `workspace:*` in their `package.json`.

## Build and TypeScript

- Packages expose `main` / `types` as `src/index.ts` (source TypeScript consumed directly in dev via `ts-node-dev` / Vite).
- `pnpm build` runs each package's `tsc` where defined.

## Adding a new shared package

1. Create `packages/<name>/` with `package.json` name `@gallery/<name>`
2. Add to `pnpm-workspace.yaml` (already globbed as `packages/*`)
3. Run `pnpm install` from root
4. Add `workspace:*` dependency from apps
