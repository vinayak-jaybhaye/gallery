/**
 * High-resolution timing utilities for benchmarks.
 */

export interface TimingResult {
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

/**
 * Measure the execution time of an async function.
 */
export async function measure<T>(fn: () => Promise<T>): Promise<{ result: T } & TimingResult> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const finishedAt = new Date().toISOString();

  return {
    result,
    durationMs: Math.round((end - start) * 100) / 100,
    startedAt,
    finishedAt,
  };
}

/**
 * Run a function N times and collect timing stats.
 */
export async function measureN(
  fn: () => Promise<void>,
  iterations: number
): Promise<{
  times: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  total: number;
  iterations: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(Math.round((end - start) * 100) / 100);
  }

  times.sort((a, b) => a - b);

  const total = times.reduce((sum, t) => sum + t, 0);

  return {
    times,
    min: times[0],
    max: times[times.length - 1],
    mean: Math.round((total / times.length) * 100) / 100,
    median: times[Math.floor(times.length / 2)],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
    total: Math.round(total * 100) / 100,
    iterations,
  };
}

/**
 * Run a function N times concurrently and collect timing stats.
 */
export async function measureConcurrent(
  fn: () => Promise<void>,
  concurrency: number
): Promise<{
  times: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  totalWallTime: number;
  concurrency: number;
}> {
  const times: number[] = [];

  const wallStart = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(Math.round((end - start) * 100) / 100);
    })
  );
  const wallEnd = performance.now();

  times.sort((a, b) => a - b);

  return {
    times,
    min: times[0] ?? 0,
    max: times[times.length - 1] ?? 0,
    mean: times.length ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 100) / 100 : 0,
    median: times[Math.floor(times.length / 2)] ?? 0,
    p95: times[Math.floor(times.length * 0.95)] ?? 0,
    p99: times[Math.floor(times.length * 0.99)] ?? 0,
    totalWallTime: Math.round((wallEnd - wallStart) * 100) / 100,
    concurrency,
  };
}

/**
 * Run a function continuously concurrently for a specific duration (in seconds) and collect timing stats.
 * Does not cancel currently running iterations when time is up, just stops starting new ones.
 */
export async function measureConcurrentDuration(
  fn: () => Promise<void>,
  concurrency: number,
  durationSeconds: number
): Promise<{
  times: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  totalWallTime: number;
  concurrency: number;
  iterations: number;
}> {
  const times: number[] = [];
  const durationMs = durationSeconds * 1000;
  const wallStart = performance.now();

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (performance.now() - wallStart < durationMs) {
        const start = performance.now();
        await fn();
        const end = performance.now();
        times.push(Math.round((end - start) * 100) / 100);
      }
    })
  );
  const wallEnd = performance.now();

  times.sort((a, b) => a - b);

  return {
    times,
    min: times[0] ?? 0,
    max: times[times.length - 1] ?? 0,
    mean: times.length ? Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 100) / 100 : 0,
    median: times[Math.floor(times.length / 2)] ?? 0,
    p95: times[Math.floor(times.length * 0.95)] ?? 0,
    p99: times[Math.floor(times.length * 0.99)] ?? 0,
    totalWallTime: Math.round((wallEnd - wallStart) * 100) / 100,
    concurrency,
    iterations: times.length,
  };
}

/**
 * Format milliseconds into a human-readable string.
 */
export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
