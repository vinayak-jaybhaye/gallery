import { db } from "@/lib/db/db";

let isUploading = false;
let recordingFinished = false;
let activeMediaId: string | null = null;
let authToken: string | null = null;

const MAX_RETRIES = 5;

function log(...args: any[]) {
  console.log("[UploadWorker]", ...args);
}

function error(...args: any[]) {
  console.error("[UploadWorker]", ...args);
}

log("Initialized");

self.onmessage = async (event) => {
  log("Message received:", event.data);

  if (event.data.type === "SET_AUTH") {
    authToken = event.data.token;
    log("Auth token set:", !!authToken);
    return;
  }

  if (event.data.type === "START_UPLOAD") {
    activeMediaId = event.data.mediaId;
    log("START_UPLOAD for mediaId:", activeMediaId);

    if (!isUploading) {
      log("Starting upload loop");
      isUploading = true;
      await processQueue(activeMediaId);
      isUploading = false;
      log("Upload loop finished");
    } else {
      log("Already uploading — ignoring START_UPLOAD");
    }
  }

  if (event.data.type === "RECORDING_FINISHED") {
    recordingFinished = true;
    log("RECORDING_FINISHED for mediaId:", activeMediaId);
    await tryComplete();
  }
};

async function processQueue(mediaId: string) {
  log("Checking pending parts for mediaId:", mediaId);

  const pendingParts = await db.parts
    .where({ mediaId })
    .and(part => !part.uploaded)
    .sortBy("partNumber");

  log("Pending parts:", pendingParts.map(p => p.partNumber));

  if (pendingParts.length === 0) {
    log("No pending parts left");
    await tryComplete();
    return;
  }

  const currentPart = pendingParts[0];

  log(
    `Processing part ${currentPart.partNumber} (retries=${currentPart.retries})`
  );

  try {
    await uploadSinglePart(currentPart);
    log(`Part ${currentPart.partNumber} uploaded successfully`);
    await processQueue(mediaId);
  } catch (err) {
    error(
      `Part ${currentPart.partNumber} failed permanently:`,
      err
    );
  }
}

async function uploadSinglePart(part: any) {
  try {
    if (!authToken) {
      throw new Error("Auth token missing in worker");
    }

    log(`Requesting signed URL for part ${part.partNumber}`);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/uploads/${part.mediaId}/part-urls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          partNumbers: [part.partNumber]
        })
      }
    );

    log("Signed URL response status:", res.status);

    if (!res.ok) {
      throw new Error("Failed to get signed URL");
    }

    const data = await res.json();
    log("Signed URL response body:", data);

    const signedUrl = data.urls[0].url;

    log(`Uploading part ${part.partNumber} to S3`);

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      body: part.blob
    });

    log(
      `S3 upload response for part ${part.partNumber}:`,
      uploadRes.status
    );

    if (!uploadRes.ok) {
      throw new Error("S3 upload failed");
    }

    const etag = uploadRes.headers.get("ETag");
    log(`Received ETag for part ${part.partNumber}:`, etag);

    await db.parts.update(part.id!, {
      uploaded: true,
      etag
    });

    log(`DB updated for part ${part.partNumber}`);

  } catch (err) {
    const newRetries = part.retries + 1;

    log(
      `Upload failed for part ${part.partNumber}. Retry ${newRetries}/${MAX_RETRIES}`
    );

    if (newRetries > MAX_RETRIES) {
      error(
        `Max retries exceeded for part ${part.partNumber}`
      );
      throw new Error("Max retries exceeded");
    }

    await db.parts.update(part.id!, {
      retries: newRetries
    });

    const delay = Math.pow(2, newRetries) * 1000;

    log(
      `Waiting ${delay}ms before retrying part ${part.partNumber}`
    );

    await sleep(delay);

    await uploadSinglePart({
      ...part,
      retries: newRetries
    });
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryComplete() {
  log("Checking if upload can complete...");

  if (!recordingFinished) {
    log("Cannot complete — recording not finished");
    return;
  }

  if (!activeMediaId) {
    log("Cannot complete — no activeMediaId");
    return;
  }

  const remaining = await db.parts
    .where({ mediaId: activeMediaId })
    .and(part => !part.uploaded)
    .count();

  log("Remaining unuploaded parts:", remaining);

  if (remaining > 0) {
    log("Cannot complete — parts still pending");
    return;
  }

  log("All parts uploaded. Preparing completion request");

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/uploads/${activeMediaId}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
    }
  );

  log("Complete response status:", res.status);

  if (!res.ok) {
    throw new Error("Failed to complete upload");
  }

  log("Upload completed successfully 🎉");
}