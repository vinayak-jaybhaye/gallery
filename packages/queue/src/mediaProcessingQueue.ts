import { Queue, Worker, type Job } from "bullmq";
import { closeRedisConnection, getRedisConnection } from "./redis";

export const MEDIA_PROCESSING_QUEUE = "media-processing";

export type MediaProcessingJobData = {
  mediaId: string;
};

export type MediaProcessingJobProcessor = (
  job: Job<MediaProcessingJobData>
) => Promise<void>;

let mediaProcessingQueue: Queue<MediaProcessingJobData> | null = null;

export function getMediaProcessingQueue(): Queue<MediaProcessingJobData> {
  if (!mediaProcessingQueue) {
    mediaProcessingQueue = new Queue<MediaProcessingJobData>(MEDIA_PROCESSING_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });
  }
  return mediaProcessingQueue;
}

function isDuplicateJobError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("already exists");
}

/** Enqueue a media row for background processing (after status → processing). */
export async function enqueueMediaProcessingJob(mediaId: string): Promise<void> {
  const queue = getMediaProcessingQueue();
  try {
    await queue.add(
      "process",
      { mediaId },
      {
        jobId: mediaId,
      }
    );
  } catch (err) {
    if (isDuplicateJobError(err)) return;
    throw err;
  }
}

export function getMediaWorkerConcurrency(): number {
  const raw = process.env.MEDIA_WORKER_CONCURRENCY;
  const parsed = raw ? Number.parseInt(raw, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function createMediaProcessingWorker(
  processor: MediaProcessingJobProcessor
): Worker<MediaProcessingJobData> {
  return new Worker<MediaProcessingJobData>(MEDIA_PROCESSING_QUEUE, processor, {
    connection: getRedisConnection(),
    concurrency: getMediaWorkerConcurrency(),
  });
}

export async function closeMediaProcessingQueue(): Promise<void> {
  if (mediaProcessingQueue) {
    await mediaProcessingQueue.close();
    mediaProcessingQueue = null;
  }
  await closeRedisConnection();
}
