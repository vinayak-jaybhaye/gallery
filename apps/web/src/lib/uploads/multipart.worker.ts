type StartMessage = {
  type: "START_UPLOAD" | "RESUME_UPLOAD";
  mediaId: string;
  file: File;
  partSize: number;
  uploadedParts: { partNumber: number; etag: string }[];
};

type SignedUrlsResponse = {
  type: "SIGNED_URLS_RESPONSE";
  urls: { partNumber: number; url: string }[];
};

type AbortMessage = {
  type: "ABORT";
};

type WorkerMessage = StartMessage | SignedUrlsResponse | AbortMessage;

let fileRef: File | null = null;
let partSizeRef = 0;
let uploadedPartsSet = new Set<number>();
let totalParts = 0;
let uploadedBytes = 0;
let abortController = new AbortController();

const urlCache = new Map<number, string>();
let pendingUrlResolvers: Array<() => void> = [];
let urlRequestInFlight = false;

const CONCURRENCY = 3;
const URL_BATCH_SIZE = 10;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;

  if (data.type === "START_UPLOAD" || data.type === "RESUME_UPLOAD") {
    try {
      await handleUpload(data);
    } catch (err: any) {
      self.postMessage({
        type: "UPLOAD_ERROR",
        error: err.message || "Upload failed",
      });
    }
  }

  if (data.type === "SIGNED_URLS_RESPONSE") {
    for (const { partNumber, url } of data.urls) {
      urlCache.set(partNumber, url);
    }

    urlRequestInFlight = false;
    const resolvers = pendingUrlResolvers;
    pendingUrlResolvers = [];
    resolvers.forEach((resolve) => resolve());
  }

  if (data.type === "ABORT") {
    abortController.abort();
  }
};

async function handleUpload(data: StartMessage) {
  fileRef = data.file;
  partSizeRef = data.partSize;
  abortController = new AbortController();

  totalParts = Math.ceil(fileRef.size / partSizeRef);

  uploadedPartsSet = new Set(
    data.uploadedParts.map((p) => p.partNumber)
  );

  uploadedBytes =
    data.uploadedParts.length * partSizeRef;

  const missingParts: number[] = [];

  for (let i = 1; i <= totalParts; i++) {
    if (!uploadedPartsSet.has(i)) {
      missingParts.push(i);
    }
  }

  await uploadWithConcurrency(missingParts);

  self.postMessage({
    type: "UPLOAD_COMPLETE",
  });
}

async function uploadWithConcurrency(parts: number[]) {
  let index = 0;

  async function workerLoop() {
    while (index < parts.length) {
      const partNumber = parts[index++];

      if (!urlCache.has(partNumber)) {
        await requestUrlBatch(parts.slice(index - 1));
      }

      await uploadSinglePart(partNumber);
    }
  }

  const workers = Array.from(
    { length: CONCURRENCY },
    workerLoop
  );

  await Promise.all(workers);
}

async function requestUrlBatch(remainingParts: number[]) {
  const batch = remainingParts
    .filter((p) => !urlCache.has(p))
    .slice(0, URL_BATCH_SIZE);

  if (batch.length === 0) return;

  await new Promise<void>((resolve) => {
    pendingUrlResolvers.push(resolve);

    if (!urlRequestInFlight) {
      urlRequestInFlight = true;
      self.postMessage({
        type: "REQUEST_SIGNED_URLS",
        partNumbers: batch,
      });
    }
  });
}

async function uploadSinglePart(partNumber: number) {
  if (!fileRef) return;

  const start = (partNumber - 1) * partSizeRef;
  const end = Math.min(start + partSizeRef, fileRef.size);
  const blob = fileRef.slice(start, end);

  const url = urlCache.get(partNumber);
  if (!url) throw new Error("Missing signed URL");

  const etag = await uploadBlob(url, blob);

  uploadedPartsSet.add(partNumber);

  return etag;
}

async function uploadBlob(url: string, blob: Blob): Promise<string> {
  let lastReportedBytes = 0;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const delta = e.loaded - lastReportedBytes;
        if (delta > 0) {
          uploadedBytes += delta;
          lastReportedBytes = e.loaded;

          self.postMessage({
            type: "PROGRESS",
            uploadedBytes,
          });
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("Missing ETag in S3 response"));
          return;
        }
        resolve(etag.replaceAll('"', ""));
      } else {
        // Rollback progress on failure
        uploadedBytes -= lastReportedBytes;
        reject(new Error(`Part upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      uploadedBytes -= lastReportedBytes;
      reject(new Error("Network error"));
    };

    xhr.ontimeout = () => {
      uploadedBytes -= lastReportedBytes;
      reject(new Error("Upload timeout"));
    };

    xhr.open("PUT", url);
    xhr.send(blob);
  });
}