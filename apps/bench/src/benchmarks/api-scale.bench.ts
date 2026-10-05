import { exec } from "child_process";
import path from "path";
import util from "util";
import { BenchmarkResult } from "../reporter";
import { RunnerOptions } from "../runner";
import { simulateUserSession } from "./sustained-load.bench";

const execAsync = util.promisify(exec);

async function scaleApi(replicas: number) {
  console.log(`    Scaling API to ${replicas} replica(s)...`);
  await execAsync(`docker compose up -d --scale api=${replicas} --no-recreate`, {
    cwd: path.join(__dirname, "../../../.."),
  });
  // Restart nginx to pick up the new replica IPs
  await execAsync(`docker compose restart nginx`, {
    cwd: path.join(__dirname, "../../../.."),
  });
  // Wait a few seconds for new replicas to boot and connect
  await new Promise((res) => setTimeout(res, 5000));
}

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

export async function run(options: RunnerOptions): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const durationSeconds = options.durationSeconds || 60; // 60s per run
  const durationMs = durationSeconds * 1000;
  const userCount = 1000;
  
  for (const replicas of [1, 2, 4]) {
    await scaleApi(replicas);
    
    console.log(`    ⏳ Running load test on ${replicas} replica(s) for ${durationSeconds}s with ${userCount} VUs...`);

    const wallStart = performance.now();

    // Launch all user sessions concurrently
    const { getAuthToken } = require("../helpers/api-client");
    await getAuthToken();

    const allSessions = await Promise.all(
      Array.from({ length: userCount }, (_, i) => simulateUserSession(i, durationMs))
    );

    const wallEnd = performance.now();
    const wallTime = Math.round((wallEnd - wallStart) * 100) / 100;

    // Snapshot stats right at the end of the run
    const stats = await getContainerStats();
    let totalApiCpu = 0;
    let apiCount = 0;
    let totalApiMem = 0;
    let dbCpu = "0%";

    for (const stat of stats) {
      if (stat.name.startsWith("gallery-api")) {
        totalApiCpu += parseFloat(stat.cpu.replace("%", ""));
        // Mem is something like "150MiB / 2GiB"
        const memStr = stat.mem.split("/")[0].trim().replace(/[a-zA-Z]/g, "");
        totalApiMem += parseFloat(memStr);
        apiCount++;
      } else if (stat.name === "gallery-db") {
        dbCpu = stat.cpu;
      }
    }

    const avgApiCpu = (totalApiCpu / (apiCount || 1)).toFixed(2) + "%";
    const avgApiMem = (totalApiMem / (apiCount || 1)).toFixed(2) + " MiB";

    // Flatten all results
    const allRequests = allSessions.flat();
    const successRequests = allRequests.filter((r) => !r.error);
    const failedRequests = allRequests.filter((r) => !!r.error);
    const allErrors = failedRequests.map(r => r.error!);

    // Calculate stats
    const durations = allRequests.map((r) => r.durationMs).sort((a, b) => a - b);
    const totalRequests = allRequests.length;

    results.push({
      suite: "API Horizontal Scale",
      scenario: `${replicas} replica(s) at 1000 VUs`,
      timestamp: new Date().toISOString(),
      durationMs: wallTime,
      errors: allErrors,
      metrics: [
        { name: "Total requests", value: totalRequests, unit: "reqs" },
        { name: "Successful", value: successRequests.length, unit: "reqs" },
        { name: "Failed", value: failedRequests.length, unit: "reqs" },
        { name: "Error rate", value: ((failedRequests.length / totalRequests) * 100).toFixed(1), unit: "%" },
        { name: "Median latency", value: durations[Math.floor(durations.length / 2)] || 0, unit: "ms" },
        { name: "P95 latency", value: durations[Math.floor(durations.length * 0.95)] || 0, unit: "ms" },
        { name: "P99 latency", value: durations[Math.floor(durations.length * 0.99)] || 0, unit: "ms" },
        { name: "Throughput", value: Math.round((totalRequests / (wallTime / 1000))), unit: "req/s" },
        { name: "Avg API CPU", value: avgApiCpu, unit: "" },
        { name: "Avg API Mem", value: avgApiMem, unit: "" },
        { name: "PostgreSQL CPU", value: dbCpu, unit: "" },
      ],
    });
  }

  // Scale back to 1
  await scaleApi(1);

  return results;
}
