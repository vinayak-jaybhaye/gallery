import {
  getPartUploadUrls,
  completeUpload,
  getUploadStatus,
} from "@/api/upload";

import { useUploadStore } from "@/store/uploadStore";
import { db } from "@/lib/db";

class StreamManager {
  private activeUploads = new Map<string, Worker>();

  async startUpload(mediaId: string, uploadType: "streaming" | "uploading") {
    if (this.activeUploads.has(mediaId)) {
      return;
    }

    // Get durable upload state from backend
    const { uploadedParts } = await getUploadStatus(mediaId);

    const uploadedBytes = uploadedParts.reduce(
      (acc, p) => acc + p.sizeBytes,
      0
    );

    // Calculate pending bytes from IndexedDB
    const pendingParts = await db.parts
      .where("mediaId")
      .equals(mediaId)
      .toArray();

    const pendingBytes = pendingParts.reduce(
      (acc, p) => acc + p.blob.size,
      0
    );

    const totalRecordedBytes = uploadedBytes + pendingBytes;

    // Initialize store with durable progress
    useUploadStore
      .getState()
      .updateProgress(mediaId, uploadedBytes);
    useUploadStore
      .getState()
      .increamentUploadSizeBytes(mediaId, totalRecordedBytes)

    const worker = new Worker(
      new URL("./stream.worker.ts", import.meta.url),
      { type: "module" }
    );

    this.activeUploads.set(mediaId, worker);

    // Keep "streaming" status during recording, set "uploading" only after recording finishes
    useUploadStore.getState().setStatus(mediaId, uploadType);

    worker.onmessage = (event) => {
      this.handleWorkerMessage(mediaId, event.data);
    };

    worker.postMessage({
      type: "START_UPLOAD",
      mediaId,
      uploadedBytes,
      uploadType: uploadType,
    });
  }

  stopUpload(mediaId: string) {
    const worker = this.activeUploads.get(mediaId);
    if (!worker) return;

    worker.postMessage({ type: "STOP_UPLOAD" });
  }

  notifyRecordingFinished(mediaId: string) {
    const worker = this.activeUploads.get(mediaId);
    if (!worker) return;

    worker.postMessage({ type: "RECORDING_FINISHED" });
  }

  // stop worker if present, delete data from indexedDb
  abortUpload(mediaId: string) {
    this.stopUpload(mediaId);
    db.parts.where("mediaId").equals(mediaId).delete();
  }

  private async handleWorkerMessage(
    mediaId: string,
    data: any
  ) {
    const store = useUploadStore.getState();

    switch (data.type) {
      case "PROGRESS_UPDATE":
        store.updateProgress(mediaId, data.uploadedBytes);
        break;

      case "REQUEST_SIGNED_URLS":
        await this.handleSignedUrlRequest(
          mediaId,
          data.partNumbers
        );
        break;

      case "UPLOAD_COMPLETE":
        try {
          await completeUpload(mediaId);
          store.removeUpload(mediaId);
        } catch (err) {
          store.setStatus(mediaId, "failed");
        } finally {
          this.cleanup(mediaId);
        }
        break;

      case "UPLOAD_ERROR":
        store.setStatus(mediaId, "failed");
        this.cleanup(mediaId);
        break;
    }
  }

  private async handleSignedUrlRequest(
    mediaId: string,
    partNumbers: number[]
  ) {
    try {
      const { urls } = await getPartUploadUrls(
        mediaId,
        partNumbers
      );

      const urlMap: Record<number, string> = {};
      for (const item of urls) {
        urlMap[item.partNumber] = item.url;
      }

      const worker = this.activeUploads.get(mediaId);
      worker?.postMessage({
        type: "SIGNED_URLS_RESPONSE",
        urls: urlMap,
      });
    } catch (err) {
      useUploadStore
        .getState()
        .setStatus(mediaId, "failed");

      this.cleanup(mediaId);
    }
  }

  private cleanup(mediaId: string) {
    const worker = this.activeUploads.get(mediaId);

    if (worker) {
      worker.terminate();
    }

    this.activeUploads.delete(mediaId);
  }
}

export const streamManager = new StreamManager();