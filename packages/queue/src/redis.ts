import IORedis from "ioredis";

let sharedConnection: IORedis | null = null;

export function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return url;
}

/** Shared Redis connection for BullMQ (maxRetriesPerRequest must be null). */
export function getRedisConnection(): IORedis {
  if (!sharedConnection) {
    sharedConnection = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null,
    });
  }
  return sharedConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
