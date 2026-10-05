/**
 * Benchmark: Concurrent User Simulation
 *
 * Simulates realistic mixed workloads — multiple users browsing feeds,
 * fetching media details, and listing albums simultaneously.
 */
import { createAuthClient } from "../helpers/api-client";
import { BenchmarkResult } from "../reporter";

interface RequestResult {
  endpoint: string;
  status: number;
  durationMs: number;
  error: boolean;
}

/**
 * Simulate a single user session: login → browse feed → view details → list albums.
 */
async function simulateUserSession(sessionId: number): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  const client = await createAuthClient();

  const endpoints = [
    { method: "GET" as const, path: "/media?limit=20", name: "Browse feed" },
    { method: "GET" as const, path: "/media?limit=20&type=image", name: "Filter images" },
    { method: "GET" as const, path: "/albums", name: "List albums" },
    { method: "GET" as const, path: "/media?limit=20", name: "Browse feed (2nd page)" },
    { method: "GET" as const, path: "/auth/me", name: "Get profile" },
  ];

  for (const ep of endpoints) {
    const start = performance.now();
    try {
      const res = await client.request({ method: ep.method, url: ep.path });
      const end = performance.now();
      results.push({
        endpoint: `${ep.method} ${ep.path}`,
        status: res.status,
        durationMs: Math.round((end - start) * 100) / 100,
        error: res.status >= 400,
      });
    } catch (err: any) {
      const end = performance.now();
      results.push({
        endpoint: `${ep.method} ${ep.path}`,
        status: err.response?.status || 0,
        durationMs: Math.round((end - start) * 100) / 100,
        error: true,
      });
    }
  }

  return results;
}

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  for (const userCount of [5, 10, 20]) {
    console.log(`    ⏳ Simulating ${userCount} concurrent users...`);

    const wallStart = performance.now();

    // Launch all user sessions concurrently
    const allSessions = await Promise.all(
      Array.from({ length: userCount }, (_, i) => simulateUserSession(i))
    );

    const wallEnd = performance.now();
    const wallTime = Math.round((wallEnd - wallStart) * 100) / 100;

    // Flatten all results
    const allRequests = allSessions.flat();
    const successRequests = allRequests.filter((r) => !r.error);
    const failedRequests = allRequests.filter((r) => r.error);

    // Calculate stats
    const durations = allRequests.map((r) => r.durationMs).sort((a, b) => a - b);
    const totalRequests = allRequests.length;
    const totalDuration = durations.reduce((s, d) => s + d, 0);

    results.push({
      suite: "Concurrent Users",
      scenario: `${userCount} users, mixed workload`,
      timestamp: new Date().toISOString(),
      durationMs: wallTime,
      metrics: [
        { name: "Total requests", value: totalRequests, unit: "reqs" },
        { name: "Successful", value: successRequests.length, unit: "reqs" },
        { name: "Failed", value: failedRequests.length, unit: "reqs" },
        { name: "Error rate", value: ((failedRequests.length / totalRequests) * 100).toFixed(1), unit: "%" },
        { name: "Min latency", value: durations[0], unit: "ms" },
        { name: "Median latency", value: durations[Math.floor(durations.length / 2)], unit: "ms" },
        { name: "P95 latency", value: durations[Math.floor(durations.length * 0.95)], unit: "ms" },
        { name: "P99 latency", value: durations[Math.floor(durations.length * 0.99)], unit: "ms" },
        { name: "Max latency", value: durations[durations.length - 1], unit: "ms" },
        { name: "Wall time", value: wallTime, unit: "ms" },
        { name: "Throughput", value: Math.round((totalRequests / wallTime) * 1000), unit: "req/s" },
      ],
    });

    // Per-endpoint breakdown
    const endpointGroups = new Map<string, number[]>();
    for (const req of allRequests) {
      if (!endpointGroups.has(req.endpoint)) {
        endpointGroups.set(req.endpoint, []);
      }
      endpointGroups.get(req.endpoint)!.push(req.durationMs);
    }

    for (const [endpoint, times] of endpointGroups) {
      times.sort((a, b) => a - b);
      const mean = Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 100) / 100;

      results.push({
        suite: "Concurrent Users",
        scenario: `${userCount}u: ${endpoint}`,
        timestamp: new Date().toISOString(),
        durationMs: mean,
        metrics: [
          { name: "Requests", value: times.length, unit: "reqs" },
          { name: "Min", value: times[0], unit: "ms" },
          { name: "Mean", value: mean, unit: "ms" },
          { name: "P95", value: times[Math.floor(times.length * 0.95)], unit: "ms" },
          { name: "Max", value: times[times.length - 1], unit: "ms" },
        ],
      });
    }
  }

  return results;
}
