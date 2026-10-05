/**
 * Benchmark: S3 Upload Flow
 *
 * Measures presigned URL generation speed and actual upload throughput
 * through the API's upload endpoints.
 */
import { createAuthClient } from "../helpers/api-client";
import { measureN, measureConcurrent, formatMs } from "../helpers/timer";
import { BenchmarkResult } from "../reporter";
import fs from "fs";
import path from "path";
import axios from "axios";

const SAMPLE_MEDIA_DIR = path.resolve(__dirname, "../../../..", "sample-media");
const ITERATIONS = 20;

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const client = await createAuthClient();

  // Find a sample image for uploads
  const sampleFiles = fs.readdirSync(SAMPLE_MEDIA_DIR);
  const sampleImage = sampleFiles.find((f) => /\.(png|jpg|jpeg)$/i.test(f));

  if (!sampleImage) {
    console.log("    ⚠️  No sample images found, skipping S3 upload benchmarks");
    return results;
  }

  const imageBuffer = fs.readFileSync(path.join(SAMPLE_MEDIA_DIR, sampleImage));
  const imageSizeBytes = imageBuffer.length;

  // ── Start upload (presigned URL generation) ─────────────────────
  {
    const stats = await measureN(async () => {
      const res = await client.post("/uploads", {
        type: "image",
        mimeType: "image/png",
        sizeBytes: imageSizeBytes,
        title: `bench-upload-${Date.now()}`,
        source: "file",
      });

      if (res.status !== 200 && res.status !== 201) {
        throw new Error(`Start upload failed: ${res.status} ${JSON.stringify(res.data)}`);
      }

      // Cleanup: abort if it was multipart
      if (res.data.mediaId) {
        await client.delete(`/uploads/${res.data.mediaId}`).catch(() => {});
      }
    }, ITERATIONS);

    results.push({
      suite: "S3 Upload",
      scenario: "POST /uploads (presign generation)",
      timestamp: new Date().toISOString(),
      durationMs: stats.total,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "P99", value: stats.p99, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
      ],
    });
  }

  // ── Full single upload flow (start → PUT → complete) ────────────
  {
    const uploadTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();

      // 1. Start upload
      const startRes = await client.post("/uploads", {
        type: "image",
        mimeType: "image/png",
        sizeBytes: imageSizeBytes,
        title: `bench-full-upload-${Date.now()}`,
        source: "file",
      });

      if (startRes.data.uploadType !== "single" || !startRes.data.uploadUrl) {
        // Multipart — skip full flow test for this iteration
        if (startRes.data.mediaId) {
          await client.delete(`/uploads/${startRes.data.mediaId}`).catch(() => {});
        }
        continue;
      }

      // 2. PUT file to presigned URL
      await axios.put(startRes.data.uploadUrl, imageBuffer, {
        headers: { "Content-Type": "image/png" },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // 3. Complete upload
      await client.post(`/uploads/${startRes.data.mediaId}/complete`);

      const end = performance.now();
      uploadTimes.push(Math.round((end - start) * 100) / 100);
    }

    if (uploadTimes.length > 0) {
      uploadTimes.sort((a, b) => a - b);
      const total = uploadTimes.reduce((s, t) => s + t, 0);

      results.push({
        suite: "S3 Upload",
        scenario: `Full upload flow (${(imageSizeBytes / 1024 / 1024).toFixed(1)}MB image)`,
        timestamp: new Date().toISOString(),
        durationMs: total,
        metrics: [
          { name: "File size", value: (imageSizeBytes / 1024 / 1024).toFixed(2), unit: "MB" },
          { name: "Min", value: uploadTimes[0], unit: "ms" },
          { name: "Median", value: uploadTimes[Math.floor(uploadTimes.length / 2)], unit: "ms" },
          { name: "Max", value: uploadTimes[uploadTimes.length - 1], unit: "ms" },
          { name: "Avg throughput", value: ((imageSizeBytes * uploadTimes.length) / (total / 1000) / 1024 / 1024).toFixed(2), unit: "MB/s" },
        ],
      });
    }
  }

  // ── Concurrent presigned URL generation ─────────────────────────
  {
    const concurrency = 10;
    const stats = await measureConcurrent(async () => {
      const res = await client.post("/uploads", {
        type: "image",
        mimeType: "image/png",
        sizeBytes: imageSizeBytes,
        title: `bench-concurrent-${Date.now()}-${Math.random()}`,
        source: "file",
      });

      if (res.data.mediaId) {
        await client.delete(`/uploads/${res.data.mediaId}`).catch(() => {});
      }
    }, concurrency);

    results.push({
      suite: "S3 Upload",
      scenario: `POST /uploads (${concurrency} concurrent)`,
      timestamp: new Date().toISOString(),
      durationMs: stats.totalWallTime,
      metrics: [
        { name: "Min", value: stats.min, unit: "ms" },
        { name: "Median", value: stats.median, unit: "ms" },
        { name: "Mean", value: stats.mean, unit: "ms" },
        { name: "P95", value: stats.p95, unit: "ms" },
        { name: "Max", value: stats.max, unit: "ms" },
        { name: "Wall Time", value: stats.totalWallTime, unit: "ms" },
      ],
    });
  }

  return results;
}
