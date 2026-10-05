/**
 * Reporter: formats benchmark results as console tables and saves JSON output.
 */
import fs from "fs";
import path from "path";

export interface BenchmarkMetric {
  name: string;
  value: number | string;
  unit: string;
}

export interface ErrorDetail {
  method: string;
  endpoint: string;
  statusCode: number;
  responseBody?: string;
  latencyMs: number;
  userId: string | number;
}

export interface BenchmarkResult {
  suite: string;
  scenario: string;
  metrics: BenchmarkMetric[];
  errors?: ErrorDetail[];
  timestamp: string;
  durationMs: number;
}

const RESULTS_DIR = path.join(__dirname, "..", "results");

/**
 * Print a single benchmark result as a formatted console table.
 */
export function printResult(result: BenchmarkResult): void {
  console.log("");
  console.log(`  ┌─ ${result.suite} / ${result.scenario}`);
  console.log(`  │  Duration: ${result.durationMs}ms`);
  console.log(`  │`);

  const maxNameLen = Math.max(...result.metrics.map((m) => m.name.length));

  for (const metric of result.metrics) {
    const name = metric.name.padEnd(maxNameLen);
    const value = typeof metric.value === "number"
      ? metric.value.toFixed(2)
      : metric.value;
    console.log(`  │  ${name}  ${value} ${metric.unit}`);
  }

  if (result.errors && result.errors.length > 0) {
    console.log(`  │`);
    console.log(`  │  ⚠️  ${result.errors.length} detailed errors recorded.`);
    const errorMap = new Map<number, number>();
    for (const e of result.errors) {
      errorMap.set(e.statusCode, (errorMap.get(e.statusCode) || 0) + 1);
    }
    for (const [code, count] of errorMap.entries()) {
      console.log(`  │  Status ${code}: ${count}`);
    }
  }

  console.log(`  └─`);
}

/**
 * Print a suite summary header.
 */
export function printSuiteHeader(suiteName: string): void {
  console.log("");
  console.log("━".repeat(60));
  console.log(`  🏋️  ${suiteName}`);
  console.log("━".repeat(60));
}

/**
 * Print the final summary of all benchmarks.
 */
export function printSummary(results: BenchmarkResult[]): void {
  console.log("");
  console.log("═".repeat(60));
  console.log("  📊  BENCHMARK SUMMARY");
  console.log("═".repeat(60));
  console.log("");

  const maxSuiteLen = Math.max(...results.map((r) => r.suite.length));
  const maxScenarioLen = Math.max(...results.map((r) => r.scenario.length));

  for (const r of results) {
    const suite = r.suite.padEnd(maxSuiteLen);
    const scenario = r.scenario.padEnd(maxScenarioLen);
    console.log(`  ${suite}  ${scenario}  ${r.durationMs.toFixed(0)}ms`);
  }

  console.log("");
  console.log(`  Total: ${results.length} benchmark(s)`);
  console.log("═".repeat(60));
}

/**
 * Save all results to a timestamped JSON file.
 */
export function saveResults(results: BenchmarkResult[]): string {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `bench-${timestamp}.json`;
  const filepath = path.join(RESULTS_DIR, filename);

  const output = {
    timestamp: new Date().toISOString(),
    totalBenchmarks: results.length,
    totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    results,
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  return filepath;
}
