/// <reference lib="webworker" />

import { db } from "@/lib/db";

let running = false;
let mediaId: string;
let concurrency = 3;
let activeUploads = 0;
let uploadedBytes = 0;
let uploadType: "streaming" | "uploading" = "streaming";

// Pending URL request tracker
let pendingUrlRequest: {
  resolve: (urls: Record<number, string>) => void;
  reject: (err: Error) => void;
} | null = null;

// In-memory retry tracking (resets on manual resume)
const partRetries = new Map<number, number>();
const MAX_PART_RETRIES = 3;
const MAX_LOOP_RETRIES = 5;

self.onmessage = async (event: MessageEvent) => {
  const data = event.data;

  switch (data.type) {
    case "START_UPLOAD":
      mediaId = data.mediaId;
      running = true;
      uploadType = data.uploadType;
      uploadedBytes = data.uploadedBytes;
      partRetries.clear(); // Reset retries on start/resume
      processLoop();
      break;

    case "RECORDING_FINISHED":
      uploadType = "uploading";
      break;

    case "STOP_UPLOAD":
      running = false;
      break;

    case "SIGNED_URLS_RESPONSE":
      if (pendingUrlRequest) {
        pendingUrlRequest.resolve(data.urls);
        pendingUrlRequest = null;
      }
      break;
  }
};

// Request signed URLs from main thread and wait for response
function requestSignedUrls(partNumbers: number[]): Promise<Record<number, string>> {
  return new Promise((resolve, reject) => {
    pendingUrlRequest = { resolve, reject };
    self.postMessage({
      type: "REQUEST_SIGNED_URLS",
      partNumbers,
    });
  });
}

async function processLoop() {
  console.log("[Worker] processLoop started, mediaId:", mediaId);

  let loopRetries = 0;

  while (running) {
    try {
      // Get only the parts we need (limited to concurrency)
      const batch = await db.parts
        .where("mediaId")
        .equals(mediaId)
        .limit(concurrency)
        .sortBy("partNumber");

      if (batch.length === 0) {
        // If recording is finished, complete upload
        if (uploadType === "uploading") {
          self.postMessage({ type: "UPLOAD_COMPLETE" });
          running = false;
          return;
        }

        // Else wait for next parts to arrive in IndexedDB
        await sleep(2000);
        continue;
      }

      const partNumbers = batch.map((p) => p.partNumber);

      // Get signed URLs
      const urls = await requestSignedUrls(partNumbers);

      // Upload batch
      await uploadBatch(batch, urls);

      // Reset loop retries on success
      loopRetries = 0;
    } catch (err) {
      loopRetries++;

      if (loopRetries >= MAX_LOOP_RETRIES) {
        self.postMessage({
          type: "UPLOAD_ERROR",
          error: `Max retries exceeded: ${String(err)}`,
        });
        running = false;
        return;
      }

      await sleep(2000);
    }
  }
}

async function uploadBatch(
  parts: any[],
  urls: Record<number, string>
) {
  // Filter out parts that exceeded max retries
  const uploadableParts = parts.filter((part) => {
    const retries = partRetries.get(part.partNumber) ?? 0;
    return retries < MAX_PART_RETRIES;
  });

  if (uploadableParts.length === 0) {
    // All parts in batch exceeded retries - notify main thread
    self.postMessage({
      type: "UPLOAD_ERROR",
      error: "Max retries exceeded. Resume manually to retry.",
    });
    running = false;
    return;
  }

  await Promise.all(
    uploadableParts.map((part) => uploadPart(part, urls[part.partNumber]))
  );
}

async function uploadPart(part: any, url: string) {
  if (!url) {
    return;
  }

  let lastReportedBytes = 0;

  try {
    activeUploads++;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Calculate delta since last update
          const delta = e.loaded - lastReportedBytes;
          if (delta > 0) {
            uploadedBytes += delta;
            lastReportedBytes = e.loaded;

            self.postMessage({
              type: "PROGRESS_UPDATE",
              uploadedBytes,
            });
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));

      xhr.open("PUT", url);
      xhr.send(part.blob);
    });

    // Delete uploaded part from IndexedDB
    await db.parts.delete(part.id);
  } catch (err) {
    // Rollback progress on failure
    uploadedBytes -= lastReportedBytes;

    // Track retries in memory
    const currentRetries = partRetries.get(part.partNumber) ?? 0;
    partRetries.set(part.partNumber, currentRetries + 1);
  } finally {
    activeUploads--;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}