import { completeUpload } from "@/api/upload";
import { useUploadStore } from "@/store/uploadStore";

export async function handleSingleUpload(
  file: File,
  mediaId: string,
  uploadUrl: string
) {
  const store = useUploadStore.getState();

  // Ensure upload exists in store
  if (!store.uploads[mediaId]) {
    store.addUpload({
      mediaId,
      title: file.name,
      sizeBytes: file.size,
      uploadedBytes: 0,
      status: "uploading",
      expiresAt: null,
      type: file.type.startsWith("image") ? "image" : "video",
      mimeType: file.type,
      source: "file",
      createdAt: new Date().toISOString(),
    });
  } else {
    store.setStatus(mediaId, "uploading");
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        store.updateProgress(mediaId, event.loaded);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          await completeUpload(mediaId);

          // Remove upload from store
          store.removeUpload(mediaId);

          resolve();
        } catch (err) {
          store.setStatus(mediaId, "failed");
          reject(err);
        }
      } else {
        store.setStatus(mediaId, "failed");
        reject(new Error("Single upload failed"));
      }
    };

    xhr.onerror = () => {
      store.setStatus(mediaId, "failed");
      reject(new Error("Network error during upload"));
    };

    xhr.send(file);
  });
}