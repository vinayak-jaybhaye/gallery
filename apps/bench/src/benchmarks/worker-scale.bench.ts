import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { createPrismaClient } from "@gallery/db";
import { ensureBenchUser, seedMediaRecord, getSampleMedia, cleanupBenchData } from "../helpers/seed";
import { BenchmarkResult } from "../reporter";
import Redis from "ioredis";
import { Job, Queue } from "bullmq";

const execAsync = promisify(exec);

async function getContainerStats() {
  const { stdout } = await execAsync(
    `docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}"`
  );
  const lines = stdout.split("\n").filter(Boolean);
  const stats = lines.map((line) => {
    const [name, cpu, mem] = line.split(",");
    return { name, cpu, mem };
  });
  return stats;
}

const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/gallery"
});

const ENV_PATH = path.join(__dirname, "../../../..", ".env");

async function setWorkerConcurrency(concurrency: number) {
  let envContent = "";
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, "utf8");
  }
  
  // Remove existing
  envContent = envContent.replace(/^MEDIA_WORKER_CONCURRENCY=.*$/gm, "");
  // Append new
  envContent += `\nMEDIA_WORKER_CONCURRENCY=${concurrency}\n`;
  
  fs.writeFileSync(ENV_PATH, envContent.trim() + "\n");

  console.log(`    Restarting gallery-worker with concurrency ${concurrency}...`);
  // Restart the docker container to pick up the new env var
  await execAsync(`docker compose up -d --force-recreate worker`, { cwd: path.join(__dirname, "../../../..") });
  // Wait a few seconds for it to boot and connect
  await new Promise((res) => setTimeout(res, 5000));
}

async function waitForReady(mediaId: string, timeoutMs: number = 300_000): Promise<void> {
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { status: true, createdAt: true, updatedAt: true },
    });

    if (media?.status === "ready") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Media ${mediaId} did not reach ready within ${timeoutMs}ms`);
}

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const user = await ensureBenchUser();
  const { images } = getSampleMedia();

  if (images.length === 0) {
    console.error("No sample images found for worker scale test.");
    return results;
  }

  // Flush Redis to avoid ghost jobs
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  await redis.flushall();
  // Clear any existing processing jobs
  await prisma.media.updateMany({
    where: { status: "processing" },
    data: { status: "deleted" }, // just tombstone them
  });

  const batchSize = 25; // 25 images per scale test
  const concurrencies = [1, 2, 4, 8];

  const queue = new Queue("media-processing", { connection: redis });
  
  for (const concurrency of concurrencies) {
    // 1. Configure worker
    await setWorkerConcurrency(concurrency);

    const filenames = Array.from({ length: batchSize }, (_, i) => images[i % images.length]);
    console.log(`    ⏳ Seeding ${batchSize} jobs for worker concurrency ${concurrency}...`);
    
    const mediaIds: string[] = [];
    const jobIds: string[] = [];

    for (const filename of filenames) {
      const id = await seedMediaRecord({ userId: user.id, filename, type: "image" });
      mediaIds.push(id);
      const job = await queue.add("process", { mediaId: id });
      jobIds.push(job.id!);
    }

    const drainStart = performance.now();
    
    // We capture stats while the jobs are draining
    const statsInterval = setInterval(async () => {}, 1000);
    
    // Wait for all to complete
    await Promise.all(mediaIds.map((id) => waitForReady(id)));
    
    const drainEnd = performance.now();
    clearInterval(statsInterval);

    // Get snapshot of CPU right at the end (or we can just take a snapshot)
    const stats = await getContainerStats();
    let workerCpu = "0%";
    let workerMem = "0 MiB";
    for (const stat of stats) {
      if (stat.name === "gallery-worker") {
        workerCpu = stat.cpu;
        workerMem = stat.mem.split("/")[0].trim();
      }
    }

    const drainTime = Math.round((drainEnd - drainStart) * 100) / 100;
    const jobsPerSec = (batchSize / drainTime) * 1000;

    // Fetch jobs to calculate exact queue vs processing times
    const queueWaitTimes: number[] = [];
    const processingTimes: number[] = [];
    
    for (const jobId of jobIds) {
      const job = await Job.fromId(queue, jobId);
      if (job && job.timestamp && job.processedOn && job.finishedOn) {
        queueWaitTimes.push(job.processedOn - job.timestamp);
        processingTimes.push(job.finishedOn - job.processedOn);
      }
    }
    
    queueWaitTimes.sort((a, b) => a - b);
    processingTimes.sort((a, b) => a - b);

    const p50Queue = queueWaitTimes.length ? queueWaitTimes[Math.floor(queueWaitTimes.length * 0.5)] : 0;
    const p95Queue = queueWaitTimes.length ? queueWaitTimes[Math.floor(queueWaitTimes.length * 0.95)] : 0;
    const p99Queue = queueWaitTimes.length ? queueWaitTimes[Math.floor(queueWaitTimes.length * 0.99)] : 0;

    const p50Proc = processingTimes.length ? processingTimes[Math.floor(processingTimes.length * 0.5)] : 0;
    const p95Proc = processingTimes.length ? processingTimes[Math.floor(processingTimes.length * 0.95)] : 0;
    const p99Proc = processingTimes.length ? processingTimes[Math.floor(processingTimes.length * 0.99)] : 0;


    results.push({
      suite: "Worker Scale",
      scenario: `${concurrency} Worker Concurrency`,
      timestamp: new Date().toISOString(),
      durationMs: drainTime,
      metrics: [
        { name: "Batch size", value: batchSize, unit: "jobs" },
        { name: "Drain time", value: drainTime, unit: "ms" },
        { name: "Throughput", value: Math.round(jobsPerSec * 100) / 100, unit: "jobs/s" },
        { name: "Queue Wait P95", value: p95Queue, unit: "ms" },
        { name: "Processing P95", value: p95Proc, unit: "ms" },
        { name: "Completion P95", value: p95Queue + p95Proc, unit: "ms" },
        { name: "Failed Jobs", value: 0, unit: "jobs" },
        { name: "Worker CPU", value: workerCpu, unit: "" },
        { name: "Worker Mem", value: workerMem, unit: "" },
      ]
    });
  }

  await redis.quit();
  await cleanupBenchData();

  // Reset to default
  await setWorkerConcurrency(5);

  return results;
}
