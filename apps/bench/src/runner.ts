/**
 * Benchmark Runner CLI
 *
 * Usage:
 *   pnpm --filter bench run bench                    # Run all benchmarks
 *   pnpm --filter bench run bench:api                # Run only API latency
 *   pnpm --filter bench run bench -- --suite api-latency,db-queries
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });
import {
  BenchmarkResult,
  printSuiteHeader,
  printResult,
  printSummary,
  saveResults,
} from "./reporter";
import { ResourceMonitor, AggregatedMetrics } from "./helpers/monitor";

export interface RunnerOptions {
  durationSeconds?: number;
}

// Registry of available benchmark suites
const SUITES: Record<string, { name: string; load: () => Promise<{ run: (options: RunnerOptions) => Promise<BenchmarkResult[]> }> }> = {
  "api-latency": {
    name: "API Latency & Throughput",
    load: () => import("./benchmarks/api-latency.bench"),
  },
  "worker-pipeline": {
    name: "Media Worker Pipeline",
    load: () => import("./benchmarks/worker-pipeline.bench"),
  },
  "db-queries": {
    name: "Database Query Performance",
    load: () => import("./benchmarks/db-queries.bench"),
  },
  "s3-upload": {
    name: "S3 Upload Flow",
    load: () => import("./benchmarks/s3-upload.bench"),
  },
  "concurrent-users": {
    name: "Concurrent User Simulation",
    load: () => import("./benchmarks/concurrent-users.bench"),
  },
  "sustained-load": {
    name: "Sustained Load (Capacity Test)",
    load: () => import("./benchmarks/sustained-load.bench") as any,
  },
  "worker-scale": {
    name: "Worker Scale Test",
    load: () => import("./benchmarks/worker-scale.bench") as any,
  },
  "s3-resumable": {
    name: "S3 Resumable Upload Test",
    load: () => import("./benchmarks/s3-resumable.bench") as any,
  },
  "end-to-end": {
    name: "End-to-End Realistic Test",
    load: () => import("./benchmarks/end-to-end.bench") as any,
  },
  "api-scale": {
    name: "API Horizontal Scale Test",
    load: () => import("./benchmarks/api-scale.bench") as any,
  }
};

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let selectedSuites: string[] = Object.keys(SUITES);
  let durationSeconds: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--suite" && args[i + 1]) {
      selectedSuites = args[i + 1].split(",").map((s) => s.trim());
      i++;
    } else if (args[i] === "--duration" && args[i + 1]) {
      durationSeconds = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Validate
  for (const s of selectedSuites) {
    if (!SUITES[s]) {
      console.error(`❌ Unknown suite: "${s}"`);
      console.error(`   Available: ${Object.keys(SUITES).join(", ")}`);
      process.exit(1);
    }
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           Gallery Benchmark Suite                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Suites: ${selectedSuites.join(", ")}`);
  if (durationSeconds) {
    console.log(`  Duration: ${durationSeconds}s per applicable scenario`);
  }
  console.log(`  Time:   ${new Date().toISOString()}`);

  const allResults: BenchmarkResult[] = [];
  let aggregatedMetrics: AggregatedMetrics | undefined;

  for (const suiteKey of selectedSuites) {
    const monitor = new ResourceMonitor();
    const suite = SUITES[suiteKey];
    printSuiteHeader(suite.name);

    try {
      const mod = await suite.load();
      await monitor.start(1000); // Poll every second during suite run
      const results = await mod.run({ durationSeconds });
      const currentAgg = await monitor.stop();
      
      // Merge metrics into the results so the reporter sees them
      for (const res of results) {
        res.metrics.push(
          { name: "API CPU Avg", value: currentAgg.apiCpuAvg, unit: "%" },
          { name: "DB CPU Avg", value: currentAgg.dbCpuAvg, unit: "%" },
          { name: "Worker CPU Avg", value: currentAgg.workerCpuAvg, unit: "%" },
          { name: "Redis CPU Avg", value: currentAgg.redisCpuAvg, unit: "%" },
          { name: "Queue Wait Max", value: currentAgg.queueWaitingMax, unit: "jobs" }
        );
        printResult(res);
      }
      aggregatedMetrics = currentAgg;
      allResults.push(...results);
    } catch (err: any) {
      await monitor.stop();
      console.error(`  ❌ Suite "${suiteKey}" failed: ${err.message}`);
      if (err.config?.url) {
        console.error(`     → URL: ${err.config.url} (Status: ${err.response?.status})`);
      }
      if (err.code === "ECONNREFUSED") {
        console.error("     → Is the API server running? (docker compose up)");
      }
    }
  }

  // Summary and save
  printSummary(allResults);

  if (allResults.length > 0) {
    const filepath = saveResults(allResults);
    console.log(`\n  📁 Results saved to: ${filepath}\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
