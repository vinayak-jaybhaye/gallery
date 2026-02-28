import { useEffect, useRef, useState } from "react";
import {
  getPendingUploads,
  abortUpload,
} from "@/api/upload";
import { useUploadStore } from "@/store/uploadStore";
import { uploadManager } from "@/lib/uploads/uploadManager";

export default function Uploads() {
  const uploads = useUploadStore((s) => s.uploads);
  const removeUpload = useUploadStore((s) => s.removeUpload);
  const bootstrapUploads = useUploadStore(
    (s) => s.bootstrapUploads
  );
  const hasBootstrapped = useUploadStore(
    (s) => s.hasBootstrapped
  );

  const [loading, setLoading] = useState(true);
  const [abortingId, setAbortingId] = useState<string | null>(null);
  const [resumeTarget, setResumeTarget] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasBootstrapped) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await getPendingUploads();
        bootstrapUploads(data);
      } catch (err) {
        console.error("Failed to load uploads", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [hasBootstrapped, bootstrapUploads]);

  async function handleAbort(mediaId: string) {
    try {
      setAbortingId(mediaId);
      await abortUpload(mediaId);
      removeUpload(mediaId);
    } catch (err) {
      console.error("Abort failed", err);
    } finally {
      setAbortingId(null);
    }
  }

  function handleResumeClick(mediaId: string) {
    setResumeTarget(mediaId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !resumeTarget) return;

    const upload =
      useUploadStore.getState().uploads[resumeTarget];

    if (!upload) return;

    // Validate file matches original
    if (
      formatSize(file.size) !== formatSize(upload.sizeBytes) ||
      file.type !== upload.mimeType
    ) {
      alert("Selected file does not match original upload.");
      return;
    }

    // Resume multipart upload
    uploadManager.startMultipartUpload(
      resumeTarget,
      file
    );

    setResumeTarget(null);
    e.target.value = ""; // reset input
  }

  const uploadList = Object.values(uploads);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">
        Pending Uploads
      </h1>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {loading && (
        <p className="text-gray-500">Loading...</p>
      )}

      {!loading && uploadList.length === 0 && (
        <p className="text-gray-500">
          No pending uploads
        </p>
      )}

      <div className="space-y-4">
        {uploadList.map((upload) => {
          const progress =
            upload.sizeBytes > 0
              ? Math.min(
                100,
                Math.floor(
                  (upload.uploadedBytes /
                    upload.sizeBytes) *
                  100
                )
              )
              : 0;

          return (
            <div
              key={upload.mediaId}
              className="bg-white shadow-sm border rounded-lg p-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {upload.title}
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatSize(upload.sizeBytes)} • Expires{" "}
                    {upload.expiresAt
                      ? new Date(
                        upload.expiresAt
                      ).toLocaleDateString()
                      : "N/A"}
                  </p>

                  <div className="mt-3 w-64 bg-gray-200 rounded h-2">
                    <div
                      className="bg-blue-600 h-2 rounded transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {progress}% • {upload.status}
                  </p>
                </div>

                <div className="flex gap-2">
                  {upload.status !== "uploading" && (
                    <button
                      onClick={() =>
                        handleResumeClick(upload.mediaId)
                      }
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                      Resume
                    </button>
                  )}

                  <button
                    disabled={
                      abortingId === upload.mediaId
                    }
                    onClick={() =>
                      handleAbort(upload.mediaId)
                    }
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {abortingId === upload.mediaId
                      ? "Aborting..."
                      : "Abort"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatSize(size: number | string) {
  const bytes = Number(size);
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}