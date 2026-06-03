import "dotenv/config";
import {
  closeMediaProcessingQueue,
  createMediaProcessingWorker,
  enqueueMediaProcessingJob,
  getMediaWorkerConcurrency,
} from "@gallery/queue";
import { prisma } from "./lib/prisma";
import { runMediaProcessingJob } from "./processMediaJob";

async function drainBacklog(): Promise<void> {
  const backlog = await prisma.media.findMany({
    where: { status: "processing" },
    select: { id: true },
  });

  for (const { id } of backlog) {
    await enqueueMediaProcessingJob(id);
  }

  if (backlog.length > 0) {
    console.log(`Enqueued ${backlog.length} backlog job(s)`);
  }
}

async function startWorker() {
  console.log(
    `Media worker started (Redis + BullMQ, concurrency=${getMediaWorkerConcurrency()})...`
  );

  await drainBacklog();

  const worker = createMediaProcessingWorker(async (job) => {
    const { mediaId } = job.data;
    console.log("Processing:", mediaId, `(attempt ${job.attemptsMade + 1})`);

    try {
      await runMediaProcessingJob(mediaId);
      console.log("Done:", mediaId);
    } catch (err) {
      console.error("Failed processing:", mediaId, err);
      throw err;
    }
  });

  worker.on("failed", (job, err) => {
    console.error("Job failed:", job?.id, err);
  });

  const shutdown = async () => {
    console.log("Media worker shutting down...");
    await worker.close();
    await closeMediaProcessingQueue();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorker().catch((err) => {
  console.error("Media worker failed to start:", err);
  process.exit(1);
});
