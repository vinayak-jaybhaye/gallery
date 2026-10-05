import { createAuthClient } from "../helpers/api-client";
import { BenchmarkResult, ErrorDetail } from "../reporter";
import { RunnerOptions } from "../runner";
import fs from "fs";
import path from "path";
import axios from "axios";

interface RequestResult {
  endpoint: string;
  status: number;
  durationMs: number;
  error?: ErrorDetail;
}

const SAMPLE_MEDIA_DIR = path.resolve(__dirname, "../../../..", "sample-media");

/**
 * Simulate a single user session: login → browse feed → upload image → view details → list albums.
 */
async function simulateEndToEndSession(userId: number, durationMs: number, imageBuffer: Buffer): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  const client = await createAuthClient();

  const endpoints = [
    { method: "GET" as const, path: "/media?limit=20", name: "Browse feed" },
    { method: "GET" as const, path: "/media?limit=20&type=image", name: "Filter images" },
    { method: "POST" as const, path: "/uploads", name: "Upload Image" },
    { method: "GET" as const, path: "/albums", name: "List albums" },
    { method: "GET" as const, path: "/auth/me", name: "Get profile" },
  ];

  const sessionStart = performance.now();

  while (performance.now() - sessionStart < durationMs) {
    for (const ep of endpoints) {
      if (performance.now() - sessionStart >= durationMs) break;

      const start = performance.now();
      try {
        let status = 0;
        
        if (ep.path === "/uploads") {
          // Perform full upload flow
          const res = await client.post("/uploads", {
            type: "image",
            mimeType: "image/png",
            sizeBytes: imageBuffer.length,
            title: `bench-e2e-${Date.now()}`,
            source: "file",
          });
          status = res.status;
          
          if (res.data.uploadUrl && res.data.uploadType === "single") {
             await axios.put(res.data.uploadUrl, imageBuffer, {
                headers: { "Content-Type": "image/png" },
             });
             const compRes = await client.post(`/uploads/${res.data.mediaId}/complete`);
             status = compRes.status;
          }
        } else {
          const res = await client.request({ method: ep.method, url: ep.path });
          status = res.status;
        }

        const end = performance.now();
        
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
  
  // Hardcoded to 100 VUs and 5 minutes unless overridden
  const userCount = 100;
  const durationSeconds = options.durationSeconds || 300; 
  const durationMs = durationSeconds * 1000;

  console.log(`    ⏳ Starting End-to-End Test with ${userCount} users for ${durationSeconds}s...`);
  
  const sampleFiles = fs.readdirSync(SAMPLE_MEDIA_DIR);
  const sampleImage = sampleFiles.find((f) => /\.(png|jpg|jpeg)$/i.test(f));
  let imageBuffer = Buffer.from("");
  if (sampleImage) {
     imageBuffer = fs.readFileSync(path.join(SAMPLE_MEDIA_DIR, sampleImage));
  } else {
     console.error("No sample image found for E2E test, upload step will be skipped.");
  }

  const wallStart = performance.now();

  const allSessions = await Promise.all(
    Array.from({ length: userCount }, (_, i) => simulateEndToEndSession(i, durationMs, imageBuffer))
  );

  const wallEnd = performance.now();
  const wallTime = Math.round((wallEnd - wallStart) * 100) / 100;

  const allRequests = allSessions.flat();
  const successRequests = allRequests.filter((r) => !r.error);
  const failedRequests = allRequests.filter((r) => !!r.error);
  const allErrors = failedRequests.map(r => r.error!);

  const durations = allRequests.map((r) => r.durationMs).sort((a, b) => a - b);
  const totalRequests = allRequests.length;

  results.push({
    suite: "End to End",
    scenario: `${userCount} users, mixed ops + uploads, ${durationSeconds}s`,
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
      suite: "End to End",
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

  return results;
}
