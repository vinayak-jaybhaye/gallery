/**
 * Benchmark: API Latency & Throughput
 *
 * Measures response times and throughput for key API endpoints
 * under sequential and concurrent load.
 */
import { createAuthClient, createRawClient } from "../helpers/api-client";
import { measureN, measureConcurrent, formatMs } from "../helpers/timer";
import { BenchmarkResult } from "../reporter";

const SEQUENTIAL_ITERATIONS = 50;
const CONCURRENT_USERS = 20;

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const client = await createAuthClient();
  const rawClient = createRawClient();

  // ── Health endpoint (baseline, no DB/auth) ──────────────────────
  {
    const stats = await measureN(
      () => rawClient.get("/health").then(() => {}),
      SEQUENTIAL_ITERATIONS
    );

    results.push({
      suite: "API Latency",
      scenario: "GET /health (baseline)",
      timestamp: new Date().toISOString(),
      durationMs: stats.total,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "RPS", value: Math.round((stats.iterations / stats.total) * 1000), unit: "req/s" },
      ],
    });
  }

  // ── Auth login ──────────────────────────────────────────────────
  {
    const stats = await measureN(
      () =>
        rawClient
          .post("/auth/credentials-login", {
            email: process.env.DEV_USER_EMAIL || "dev@gallery.local",
            password: "devdev",
          })
          .then(() => {}),
      SEQUENTIAL_ITERATIONS
    );

    results.push({
      suite: "API Latency",
      scenario: "POST /auth/credentials-login (login)",
      timestamp: new Date().toISOString(),
      durationMs: stats.total,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "RPS", value: Math.round((stats.iterations / stats.total) * 1000), unit: "req/s" },
      ],
    });
  }

  // ── Media feed listing ──────────────────────────────────────────
  {
    const stats = await measureN(
      () => client.get("/media?limit=20").then(() => {}),
      SEQUENTIAL_ITERATIONS
    );

    results.push({
      suite: "API Latency",
      scenario: "GET /media (feed, limit=20)",
      timestamp: new Date().toISOString(),
      durationMs: stats.total,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "RPS", value: Math.round((stats.iterations / stats.total) * 1000), unit: "req/s" },
      ],
    });
  }

  // ── Albums listing ──────────────────────────────────────────────
  {
    const stats = await measureN(
      () => client.get("/albums").then(() => {}),
      SEQUENTIAL_ITERATIONS
    );

    results.push({
      suite: "API Latency",
      scenario: "GET /albums",
      timestamp: new Date().toISOString(),
      durationMs: stats.total,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "RPS", value: Math.round((stats.iterations / stats.total) * 1000), unit: "req/s" },
      ],
    });
  }

  // ── Concurrent: Media feed ──────────────────────────────────────
  {
    const stats = await measureConcurrent(
      () => client.get("/media?limit=20").then(() => {}),
      CONCURRENT_USERS
    );

    results.push({
      suite: "API Throughput",
      scenario: `GET /media (${CONCURRENT_USERS} concurrent)`,
      timestamp: new Date().toISOString(),
      durationMs: stats.totalWallTime,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "Wall Time", value: stats.totalWallTime, unit: "ms" },
        { name: "Effective RPS", value: Math.round((stats.concurrency / stats.totalWallTime) * 1000), unit: "req/s" },
      ],
    });
  }

  // ── Concurrent: Health ──────────────────────────────────────────
  {
    const stats = await measureConcurrent(
      () => rawClient.get("/health").then(() => {}),
      CONCURRENT_USERS
    );

    results.push({
      suite: "API Throughput",
      scenario: `GET /health (${CONCURRENT_USERS} concurrent)`,
      timestamp: new Date().toISOString(),
      durationMs: stats.totalWallTime,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "Wall Time", value: stats.totalWallTime, unit: "ms" },
        { name: "Effective RPS", value: Math.round((stats.concurrency / stats.totalWallTime) * 1000), unit: "req/s" },
      ],
    });
  }

  return results;
}
