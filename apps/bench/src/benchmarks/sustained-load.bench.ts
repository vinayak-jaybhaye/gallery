import { createAuthClient } from "../helpers/api-client";
import { BenchmarkResult, ErrorDetail } from "../reporter";
import { RunnerOptions } from "../runner";

interface RequestResult {
  endpoint: string;
  status: number;
  durationMs: number;
  error?: ErrorDetail;
}

/**
 * Simulate a single user session: login → browse feed → view details → list albums.
 */
export async function simulateUserSession(userId: number, durationMs: number): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  const client = await createAuthClient();

  const endpoints = [
    { method: "GET" as const, path: "/media?limit=20", name: "Browse feed" },
    { method: "GET" as const, path: "/media?limit=20&type=image", name: "Filter images" },
    { method: "GET" as const, path: "/albums", name: "List albums" },
    { method: "GET" as const, path: "/media?limit=20", name: "Browse feed (2nd page)" },
    { method: "GET" as const, path: "/auth/me", name: "Get profile" },
  ];

  const sessionStart = performance.now();

  while (performance.now() - sessionStart < durationMs) {
    for (const ep of endpoints) {
      if (performance.now() - sessionStart >= durationMs) break;

      const start = performance.now();
      try {
        const res = await client.request({ method: ep.method, url: ep.path });
        const end = performance.now();
        const status = res.status;
        
        const reqResult: RequestResult = {
          endpoint: `${ep.method} ${ep.path}`,
          status,
          durationMs: Math.round((end - start) * 100) / 100,
        };
        
        if (status >= 400) {
          reqResult.error = {
            method: ep.method,
            endpoint: ep.path,
            statusCode: status,
            responseBody: typeof res.data === "string" ? res.data : JSON.stringify(res.data),
            latencyMs: reqResult.durationMs,
            userId,
          };
        }
        results.push(reqResult);
      } catch (err: any) {
        const end = performance.now();
        const duration = Math.round((end - start) * 100) / 100;
        const status = err.response?.status || 0;
        
        results.push({
          endpoint: `${ep.method} ${ep.path}`,
          status,
          durationMs: duration,
          error: {
            method: ep.method,
            endpoint: ep.path,
            statusCode: status,
            responseBody: typeof err.response?.data === "string" ? err.response?.data : JSON.stringify(err.response?.data),
            latencyMs: duration,
            userId,
          },
        });
      }
    }
  }

  return results;
}

export async function run(options: RunnerOptions): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const durationSeconds = options.durationSeconds || 120; // Default 2 minutes
  const durationMs = durationSeconds * 1000;

  for (const userCount of [10, 50, 250, 500, 1000]) {
    console.log(`    ⏳ Simulating ${userCount} concurrent users for ${durationSeconds}s...`);

    const wallStart = performance.now();

    // Launch all user sessions concurrently
    const { getAuthToken } = require("../helpers/api-client");
    await getAuthToken();

    const allSessions = await Promise.all(
      Array.from({ length: userCount }, (_, i) => simulateUserSession(i, durationMs))
    );

    const wallEnd = performance.now();
    const wallTime = Math.round((wallEnd - wallStart) * 100) / 100;

    // Flatten all results
    const allRequests = allSessions.flat();
    const successRequests = allRequests.filter((r) => !r.error);
    const failedRequests = allRequests.filter((r) => !!r.error);
    const allErrors = failedRequests.map(r => r.error!);

    // Calculate stats
    const durations = allRequests.map((r) => r.durationMs).sort((a, b) => a - b);
    const totalRequests = allRequests.length;

    results.push({
      suite: "Sustained Load",
      scenario: `${userCount} users, ${durationSeconds}s`,
      timestamp: new Date().toISOString(),
      durationMs: wallTime,
      errors: allErrors,
      metrics: [
        { name: "Total requests", value: totalRequests, unit: "reqs" },
        { name: "Successful", value: successRequests.length, unit: "reqs" },
        { name: "Failed", value: failedRequests.length, unit: "reqs" },
        { name: "Error rate", value: ((failedRequests.length / totalRequests) * 100).toFixed(1), unit: "%" },
        { name: "Min latency", value: durations[0] || 0, unit: "ms" },
        { name: "Median latency", value: durations[Math.floor(durations.length / 2)] || 0, unit: "ms" },
        { name: "P95 latency", value: durations[Math.floor(durations.length * 0.95)] || 0, unit: "ms" },
        { name: "P99 latency", value: durations[Math.floor(durations.length * 0.99)] || 0, unit: "ms" },
        { name: "Max latency", value: durations[durations.length - 1] || 0, unit: "ms" },
        { name: "Wall time", value: wallTime, unit: "ms" },
        { name: "Throughput", value: Math.round((totalRequests / (wallTime / 1000))), unit: "req/s" },
      ],
    });
    
    // Detailed breakdown per endpoint to find the bottleneck
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
        suite: "Sustained Load",
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
