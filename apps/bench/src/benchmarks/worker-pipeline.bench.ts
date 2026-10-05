/**
 * Benchmark: Media Worker Pipeline
 *
 * Measures the image/video processing pipeline end-to-end:
 * S3 download → Sharp/FFmpeg processing → S3 upload → DB update.
 *
 * This benchmark injects media records into the queue and measures
 * how long the worker takes to process them.
 */
import { createPrismaClient } from "@gallery/db";
import { ensureBenchUser, seedMediaRecord, getSampleMedia, cleanupBenchData } from "../helpers/seed";
import { measure, formatMs } from "../helpers/timer";
import { BenchmarkResult } from "../reporter";

const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/gallery"
});

/**
 * Wait for a media record to reach "ready" status, polling every 500ms.
 */
async function waitForReady(mediaId: string, timeoutMs: number = 120_000): Promise<number> {
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { status: true },
    });

    if (media?.status === "ready") {
      return Math.round((performance.now() - start) * 100) / 100;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Media ${mediaId} did not reach ready within ${timeoutMs}ms`);
}

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const user = await ensureBenchUser();
  const { images, videos } = getSampleMedia();

  // ── Single image processing ──────────────────────────────────────
  if (images.length > 0) {
    const filename = images[0];
    console.log(`    ⏳ Processing single image: ${filename}`);

    const { result: mediaId, durationMs: seedTime } = await measure(() =>
      seedMediaRecord({ userId: user.id, filename, type: "image" })
    );

    // Enqueue the job (worker picks it up from "processing" status on startup or via backlog drain)
    const { enqueueMediaProcessingJob } = require("@gallery/queue");
    await enqueueMediaProcessingJob(mediaId);

    const processingTime = await waitForReady(mediaId);

    results.push({
      suite: "Worker Pipeline",
      scenario: `Single image (${filename})`,
      timestamp: new Date().toISOString(),
      durationMs: processingTime,
      metrics: [
        { name: "Seed + S3 upload", value: seedTime, unit: "ms" },
        { name: "Processing time", value: processingTime, unit: "ms" },
        { name: "Total end-to-end", value: seedTime + processingTime, unit: "ms" },
      ],
    });
  }

  // ── Single video processing ──────────────────────────────────────
  if (videos.length > 0) {
    const filename = videos[0];
    console.log(`    ⏳ Processing single video: ${filename}`);

    const { result: mediaId, durationMs: seedTime } = await measure(() =>
      seedMediaRecord({ userId: user.id, filename, type: "video" })
    );

    const { enqueueMediaProcessingJob } = require("@gallery/queue");
    await enqueueMediaProcessingJob(mediaId);

    const processingTime = await waitForReady(mediaId, 300_000); // videos take longer

    results.push({
      suite: "Worker Pipeline",
      scenario: `Single video (${filename})`,
      timestamp: new Date().toISOString(),
      durationMs: processingTime,
      metrics: [
        { name: "Seed + S3 upload", value: seedTime, unit: "ms" },
        { name: "Processing time", value: processingTime, unit: "ms" },
        { name: "Total end-to-end", value: seedTime + processingTime, unit: "ms" },
      ],
    });
  }

  // ── Batch image processing (queue drain) ─────────────────────────
  if (images.length > 0) {
    const batchSize = Math.min(images.length * 3, 10); // repeat images to get enough jobs
    const filenames = Array.from({ length: batchSize }, (_, i) => images[i % images.length]);

    console.log(`    ⏳ Batch processing ${batchSize} images...`);

    const mediaIds: string[] = [];

    // Seed all at once
    const { durationMs: totalSeedTime } = await measure(async () => {
      for (const filename of filenames) {
        const id = await seedMediaRecord({ userId: user.id, filename, type: "image" });
        mediaIds.push(id);
      }
    });

    // Enqueue all
    const { enqueueMediaProcessingJob } = require("@gallery/queue");
    for (const id of mediaIds) {
      await enqueueMediaProcessingJob(id);
    }

    // Wait for all to complete
    const drainStart = performance.now();
    await Promise.all(mediaIds.map((id) => waitForReady(id)));
    const drainTime = Math.round((performance.now() - drainStart) * 100) / 100;

    results.push({
      suite: "Worker Pipeline",
      scenario: `Batch ${batchSize} images (queue drain)`,
      timestamp: new Date().toISOString(),
      durationMs: drainTime,
      metrics: [
        { name: "Batch size", value: batchSize, unit: "jobs" },
        { name: "Total seed time", value: totalSeedTime, unit: "ms" },
        { name: "Queue drain time", value: drainTime, unit: "ms" },
        { name: "Avg per image", value: Math.round(drainTime / batchSize), unit: "ms" },
        { name: "Throughput", value: Math.round((batchSize / drainTime) * 1000 * 100) / 100, unit: "img/s" },
      ],
    });
  }

  // Cleanup
  await cleanupBenchData();

  return results;
}
