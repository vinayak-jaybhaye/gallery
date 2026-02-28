import {
  getPartUploadUrls,
  completeUpload,
  getUploadStatus,
} from "@/api/upload";

import { useUploadStore } from "@/store/uploadStore";

class UploadManager {
  private activeUploads = new Map<string, Worker>();

  async startMultipartUpload(mediaId: string, file: File) {
    // Prevent duplicate workers
    if (this.activeUploads.has(mediaId)) return;

    const worker = new Worker(
      new URL("./multipart.worker.ts", import.meta.url),
      { type: "module" }
    );

    const { uploadedParts, partSize } = await getUploadStatus(mediaId);

    this.activeUploads.set(mediaId, worker);

    // Mark as uploading
    useUploadStore.getState().setStatus(mediaId, "uploading");

    worker.onmessage = (event) => {
      this.handleWorkerMessage(mediaId, event.data);
    };

    worker.postMessage({
      type: "START_UPLOAD",
      mediaId,
      file,
      partSize,
      uploadedParts: uploadedParts ?? [],
    });
  }

  private async handleWorkerMessage(mediaId: string, data: any) {
    const store = useUploadStore.getState();

    switch (data.type) {
      case "PROGRESS":
        console.log("Progress update for mediaId:", mediaId, "uploadedBytes:", data.uploadedBytes);
        store.updateProgress(mediaId, data.uploadedBytes);
        break;

      case "UPLOAD_COMPLETE":
        try {
          await completeUpload(mediaId);

          // Remove from store
          store.removeUpload(mediaId);
        } catch (err) {
          console.error("Complete upload failed:", err);
          store.setStatus(mediaId, "failed");
        } finally {
          this.cleanup(mediaId);
        }
        break;

      case "UPLOAD_ERROR":
        console.error("Upload error:", data.error);

        store.setStatus(mediaId, "failed");
        this.cleanup(mediaId);
        break;

      case "REQUEST_SIGNED_URLS":
        await this.handleSignedUrlRequest(
          mediaId,
          data.partNumbers
        );
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
      console.log("mediaId:", mediaId, "urls:", urls);

      const worker = this.activeUploads.get(mediaId);

      worker?.postMessage({
        type: "SIGNED_URLS_RESPONSE",
        urls,
      });
    } catch (err) {
      console.error("Failed to get signed URLs:", err);

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

export const uploadManager = new UploadManager();