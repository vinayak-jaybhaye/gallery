/**
 * Benchmark: Database Query Performance
 *
 * Profiles key Prisma queries at different data scales to detect
 * slow queries and missing indexes.
 */
import { createPrismaClient } from "@gallery/db";
import { ensureBenchUser, seedReadyMediaRecords, cleanupBenchData } from "../helpers/seed";
import { measureN, formatMs } from "../helpers/timer";
import { BenchmarkResult } from "../reporter";

const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/gallery"
}, {
  log: [{ emit: "event", level: "query" }]
});

// Track query counts for N+1 detection
let queryCount = 0;
prisma.$on("query" as never, () => {
  queryCount++;
});

function resetQueryCount(): void {
  queryCount = 0;
}

function getQueryCount(): number {
  return queryCount;
}

const QUERY_ITERATIONS = 30;

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const user = await ensureBenchUser();

  // ── Seed data at different scales ────────────────────────────────
  const scales = [10000, 100000, 1000000];

  for (const scale of scales) {
    console.log(`    ⏳ Seeding ${scale} media records...`);
    await cleanupBenchData();
    await seedReadyMediaRecords(user.id, scale);

    // ── listMediaLibrary (cursor-based pagination) ──────────────
    {
      const stats = await measureN(async () => {
        resetQueryCount();
        await prisma.media.findMany({
          where: {
            ownerId: user.id,
            status: { in: ["ready", "processing"] },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 21,
        });
      }, QUERY_ITERATIONS);

      results.push({
        suite: "DB Queries",
        scenario: `listMediaLibrary (${scale} rows, limit=20)`,
        timestamp: new Date().toISOString(),
        durationMs: stats.total,
        metrics: [
          { name: "Min", value: stats.min, unit: "ms" },
          { name: "Median", value: stats.median, unit: "ms" },
          { name: "Mean", value: stats.mean, unit: "ms" },
          { name: "P95", value: stats.p95, unit: "ms" },
          { name: "P99", value: stats.p99, unit: "ms" },
          { name: "Max", value: stats.max, unit: "ms" },
        ],
      });
    }

    // ── listMediaLibrary with type filter ───────────────────────
    {
      const stats = await measureN(async () => {
        await prisma.media.findMany({
          where: {
            ownerId: user.id,
            status: { in: ["ready", "processing"] },
            type: "image",
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 21,
        });
      }, QUERY_ITERATIONS);

      results.push({
        suite: "DB Queries",
        scenario: `listMediaLibrary+typeFilter (${scale} rows)`,
        timestamp: new Date().toISOString(),
        durationMs: stats.total,
        metrics: [
          { name: "Min", value: stats.min, unit: "ms" },
          { name: "Median", value: stats.median, unit: "ms" },
          { name: "Mean", value: stats.mean, unit: "ms" },
          { name: "P95", value: stats.p95, unit: "ms" },
          { name: "P99", value: stats.p99, unit: "ms" },
        ],
      });
    }

    // ── Count media (for storage calculations) ─────────────────
    {
      const stats = await measureN(async () => {
        await prisma.media.aggregate({
          where: { ownerId: user.id },
          _sum: { sizeBytes: true },
          _count: true,
        });
      }, QUERY_ITERATIONS);

      results.push({
        suite: "DB Queries",
        scenario: `aggregateMediaSize (${scale} rows)`,
        timestamp: new Date().toISOString(),
        durationMs: stats.total,
        metrics: [
          { name: "Min", value: stats.min, unit: "ms" },
          { name: "Median", value: stats.median, unit: "ms" },
          { name: "Mean", value: stats.mean, unit: "ms" },
          { name: "P95", value: stats.p95, unit: "ms" },
        ],
      });
    }

    // ── N+1 detection: listMediaLibrary ────────────────────────
    {
      resetQueryCount();
      await prisma.media.findMany({
        where: {
          ownerId: user.id,
          status: { in: ["ready", "processing"] },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 21,
      });
      const queries = getQueryCount();

      results.push({
        suite: "DB Queries",
        scenario: `N+1 check: listMediaLibrary (${scale} rows)`,
        timestamp: new Date().toISOString(),
        durationMs: 0,
        metrics: [
          { name: "SQL queries fired", value: queries, unit: "queries" },
          { name: "Expected (no N+1)", value: 1, unit: "queries" },
          { name: "Status", value: queries <= 2 ? "✅ PASS" : "⚠️ POSSIBLE N+1", unit: "" },
        ],
      });
    }
  }

  // ── Album creation with media (transactional) ────────────────────
  {
    // Re-seed 100 records for the album test
    await cleanupBenchData();
    const mediaIds = await seedReadyMediaRecords(user.id, 100);

    const stats = await measureN(async () => {
      const albumMediaIds = mediaIds.slice(0, 10);
      const album = await prisma.$transaction(async (tx) => {
        const album = await tx.album.create({
          data: {
            ownerId: user.id,
            title: `Bench Album ${Date.now()}`,
          },
        });

        if (albumMediaIds.length > 0) {
          await tx.albumMedia.createMany({
            data: albumMediaIds.map((mediaId) => ({
              albumId: album.id,
              mediaId,
            })),
          });
        }

        return album;
      });

      // Cleanup the album so it doesn't accumulate
      await prisma.albumMedia.deleteMany({ where: { albumId: album.id } });
      await prisma.album.delete({ where: { id: album.id } });
    }, QUERY_ITERATIONS);

    results.push({
      suite: "DB Queries",
      scenario: "createAlbum (transaction, 10 media)",
      timestamp: new Date().toISOString(),
      durationMs: stats.total,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
      ],
    });
  }

  // Cleanup
  await cleanupBenchData();

  return results;
}
