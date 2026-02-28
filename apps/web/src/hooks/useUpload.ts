import { useState } from "react";
import { startUpload } from "@/api/upload";
import { handleSingleUpload } from "@/lib/uploads/singleUpload";
import { uploadManager } from "@/lib/uploads/uploadManager";
import { useUploadStore } from "@/store/uploadStore";

export function useUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    try {
      setLoading(true);
      setError(null);

      const {
        uploadType,
        mediaId,
        uploadUrl,
        partSize,
      } = await startUpload({
        type: file.type.startsWith("image")
          ? "image"
          : "video",
        mimeType: file.type,
        sizeBytes: file.size,
        title: file.name,
      });

      // add to upload store
      useUploadStore.getState().addUpload({
        mediaId,
        title: file.name,
        sizeBytes: file.size,
        uploadedBytes: 0,
        status: "uploading",
        expiresAt: null,
        type: file.type.startsWith("image") ? "image" : "video",
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      });

      //Single Upload
      if (uploadType === "single" && uploadUrl) {
        await handleSingleUpload(
          file,
          mediaId,
          uploadUrl
        );
        return;
      }

      //Multipart Upload
      if (uploadType === "multipart" && partSize) {
        await uploadManager.startMultipartUpload(
          mediaId,
          file,
        );
        return; // do NOT await
      }

      throw new Error("Invalid upload response");
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return { uploadFile, loading, error };
}