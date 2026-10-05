import { createAuthClient } from "../helpers/api-client";
import { BenchmarkResult } from "../reporter";
import axios from "axios";
import crypto from "crypto";

export async function run(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const client = await createAuthClient();

  // We need a file > 10MB to force multipart upload.
  // 15MB buffer of random data to prevent compression artifacts or caching
  const sizeBytes = 15 * 1024 * 1024;
  const mockBuffer = crypto.randomBytes(sizeBytes);
  
  console.log(`    ⏳ Testing Resumable Upload (15MB)...`);

  const iterations = 5;
  let successCount = 0;
  let totalResumeTime = 0;
  let totalRetransmitted = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now();

      // 1. Start Upload
      const startRes = await client.post("/uploads", {
        type: "video",
        mimeType: "video/mp4",
        sizeBytes: sizeBytes,
        title: `bench-resumable-${Date.now()}`,
        source: "file",
      });

      if (startRes.data.uploadType !== "multipart") {
        throw new Error("Expected multipart upload for 15MB file");
      }

      const mediaId = startRes.data.mediaId;
      const partSize = startRes.data.partSize || (5 * 1024 * 1024);
      const numParts = Math.ceil(sizeBytes / partSize);
      
      if (numParts < 3) {
         throw new Error("Expected at least 3 parts for testing interruptions");
      }

      // 2. Fetch Part URLs
      const partsRes = await client.post(`/uploads/${mediaId}/part-urls`, {
        partNumbers: Array.from({ length: numParts }, (_, i) => i + 1)
      });
      const urls = partsRes.data.urls;

      // 3. Upload Part 1 (approx 33%)
      await axios.put(urls[0].url, mockBuffer.subarray(0, partSize), {
        headers: { "Content-Type": "application/octet-stream" },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // 4. Simulating Interruption
      await new Promise(res => setTimeout(res, 500));

      const resumeStart = performance.now();
      // 5. Resume (Check status)
      const statusRes = await client.get(`/uploads/${mediaId}/status`);
      const uploadedParts = statusRes.data.uploadedParts || [];
      const uploadedPartNumbers = uploadedParts.map((p: any) => p.partNumber);
      
      const resumeEnd = performance.now();
      totalResumeTime += (resumeEnd - resumeStart);

      // Verify Part 1 is there
      if (!uploadedPartNumbers.includes(1)) {
        totalRetransmitted += 1;
        // Retransmit part 1
        await axios.put(urls[0].url, mockBuffer.subarray(0, partSize), {
          headers: { "Content-Type": "application/octet-stream" },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
      }

      // 6. Upload Part 2 (approx 66%)
      const part2Size = Math.min(partSize, sizeBytes - partSize);
      await axios.put(urls[1].url, mockBuffer.subarray(partSize, partSize + part2Size), {
        headers: { "Content-Type": "application/octet-stream" },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // 7. Simulating 2nd Interruption
      await new Promise(res => setTimeout(res, 500));

      // 8. Upload Remaining Parts
      for (let p = 2; p < numParts; p++) {
        const startIdx = p * partSize;
        const endIdx = Math.min((p + 1) * partSize, sizeBytes);
        await axios.put(urls[p].url, mockBuffer.subarray(startIdx, endIdx), {
          headers: { "Content-Type": "application/octet-stream" },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
      }

      // 9. Complete Upload
      await client.post(`/uploads/${mediaId}/complete`);

      successCount++;
    } catch (err: any) {
      console.error(`      ❌ Resume test failed:`, err.message || err.response?.data);
    }
  }

  results.push({
    suite: "Resumable Uploads",
    scenario: "Multipart 15MB with interruptions",
    timestamp: new Date().toISOString(),
    durationMs: 0,
    metrics: [
      { name: "Iterations", value: iterations, unit: "runs" },
      { name: "Success rate", value: ((successCount / iterations) * 100).toFixed(1), unit: "%" },
      { name: "Avg recovery time", value: (totalResumeTime / iterations).toFixed(2), unit: "ms" },
      { name: "Retransmitted parts", value: totalRetransmitted, unit: "parts" },
    ]
  });

  return results;
}
