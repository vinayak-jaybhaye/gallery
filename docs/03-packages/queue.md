# @gallery/queue

**Path:** `packages/queue`

Redis + BullMQ integration for **media processing jobs**.

## Queue

| Constant | Value |
|----------|-------|
| Queue name | `media-processing` |
| Job name | `process` |
| Job data | `{ mediaId: string }` |
| Job ID | `mediaId` (deduplicates waiting jobs) |

## API (producer)

```typescript
import { enqueueMediaProcessingJob } from "@gallery/queue";

await enqueueMediaProcessingJob(mediaId);
```

Called from `completeUploadService` after DB transaction sets `status: "processing"`.

### Default job options

Defined in `getMediaProcessingQueue()`:

- `attempts: 3`
- `backoff: { type: "exponential", delay: 5000 }`
- `removeOnComplete: true`
- `removeOnFail: 100`

Duplicate enqueue (same `jobId` already in queue) is ignored if error message contains `"already exists"`.

## Worker (consumer)

```typescript
import {
  createMediaProcessingWorker,
  closeMediaProcessingQueue,
  getMediaWorkerConcurrency,
} from "@gallery/queue";

const worker = createMediaProcessingWorker(async (job) => {
  const { mediaId } = job.data;
  // ...
});

await worker.close();
await closeMediaProcessingQueue();
```

Concurrency from `MEDIA_WORKER_CONCURRENCY` (default **5** jobs in parallel **per worker process**).

## Redis connection

`getRedisConnection()` in `packages/queue/src/redis.ts`:

- Singleton `ioredis` client
- `maxRetriesPerRequest: null` (required by BullMQ)
- URL from `REDIS_URL`

## Scaling

- **Vertical:** Increase `MEDIA_WORKER_CONCURRENCY`
- **Horizontal:** Run multiple `media-worker` processes; BullMQ distributes jobs across workers sharing one Redis instance
