import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  getPendingUploads,
  abortUpload,
} from "@/api/upload";
import { useUploadStore } from "@/store/uploadStore";
import { uploadManager } from "@/lib/uploads/uploadManager";
import { streamManager } from "@/lib/uploads/streamManager"
import { getErrorMessage } from "@/lib/utils";
import type { LayoutContext } from "@/components/layout/AppLayout";
import { Loader } from "@/components/ui";

export default function Uploads() {
  const outlet = useOutletContext<LayoutContext | undefined>();
  const searchQuery = outlet?.searchQuery ?? "";
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
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchKey = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (hasBootstrapped) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setError(null);
        const data = await getPendingUploads();
        bootstrapUploads(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load uploads."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [hasBootstrapped, bootstrapUploads]);

  async function handleAbort(mediaId: string, source: "file" | "streaming") {
    try {
      setError(null);
      setAbortingId(mediaId);
      if (source === "streaming") {
        streamManager.abortUpload(mediaId);
      }
      await abortUpload(mediaId);
      removeUpload(mediaId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to abort upload."));
    } finally {
      setAbortingId(null);
    }
  }

  function handleResumeClick(mediaId: string, source: "file" | "streaming") {
    if (source === "streaming") {
      setError("Streaming uploads can only be resumed from the same device.");
      streamManager.startUpload(mediaId, "uploading");
      return;
    }

    setError(null);
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
      setError("Selected file does not match the original upload.");
      e.target.value = "";
      return;
    }

    // Resume multipart upload
    uploadManager.startMultipartUpload(
      resumeTarget,
      file
    );

    setError(null);
    setResumeTarget(null);
    e.target.value = ""; // reset input
  }

  const uploadList = Object.values(uploads);
  const filteredUploadList = useMemo(() => {
    if (!searchKey) return uploadList;

    return uploadList.filter((upload) => {
      const title = upload.title.toLowerCase();
      const status = upload.status.toLowerCase();
      const typeLabel = upload.type === "video" ? "video" : "image";
      return (
        title.includes(searchKey) ||
        status.includes(searchKey) ||
        typeLabel.includes(searchKey)
      );
    });
  }, [searchKey, uploadList]);

  return (
    <div className="w-full p-4 sm:p-6 bg-bg-app">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
            {error}
          </div>
        )}
        <div className="sticky top-16 z-20 mb-6 bg-bg-app pb-4 pt-2 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary mb-1">
            Uploads
          </h1>
          <p className="text-text-secondary text-sm">
            Manage your in-progress and paused uploads
          </p>
          {searchKey && (
            <p className="text-xs text-text-muted mt-2">
              Searching uploads for: <span className="font-medium text-text-primary">{searchQuery.trim()}</span>
            </p>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader size="md" label="Loading uploads..." />
          </div>
        )}

        {!loading && uploadList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-muted flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium mb-1">No pending uploads</p>
            <p className="text-text-muted text-sm">Your uploads will appear here</p>
          </div>
        )}

        {!loading && uploadList.length > 0 && filteredUploadList.length === 0 && searchKey && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-secondary font-medium mb-1">No uploads match your search</p>
            <p className="text-text-muted text-sm">Try a different term</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredUploadList.map((upload) => {
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

            const isUploading = upload.status === "uploading" || upload.status === "streaming";
            const isPending = upload.status === "pending";
            const isFailed = upload.status === "failed";

            return (
              <div
                key={upload.mediaId}
                className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary truncate">
                        {upload.title}
                      </span>
                      <StatusBadge status={upload.status} />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>{formatSize(upload.sizeBytes)}</span>
                      <span className="text-text-muted">•</span>
                      <span>{upload.type === "video" ? "Video" : "Image"}</span>
                      {upload.expiresAt && (
                        <>
                          <span className="text-text-muted">•</span>
                          <span className="text-text-muted">
                            Expires {new Date(upload.expiresAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>

                    {isUploading && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
                          <span>{formatSize(upload.uploadedBytes)} uploaded</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-accent-primary h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {isFailed && (
                      <p className="mt-2 text-sm text-error">
                        Upload failed. Try resuming or abort to retry.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(isPending || isFailed) && (
                      <button
                        onClick={() =>
                          handleResumeClick(upload.mediaId, upload.source)
                        }
                        className="inline-flex items-center gap-1.5 bg-accent-primary text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-strong transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Resume
                      </button>
                    )}

                    {upload.status !== "streaming" && (
                      <button
                        disabled={abortingId === upload.mediaId}
                        onClick={() => handleAbort(upload.mediaId, upload.source)}
                        className="inline-flex items-center gap-1.5 bg-bg-destructive text-text-destructive-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {abortingId === upload.mediaId ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Aborting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Abort
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    uploading: "bg-info/15 text-info",
    streaming: "bg-accent-soft text-accent-primary",
    completed: "bg-success/15 text-success",
    failed: "bg-error/15 text-error",
  };

  const labels: Record<string, string> = {
    pending: "Paused",
    uploading: "Uploading",
    streaming: "Streaming",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-bg-muted text-text-muted"}`}>
      {status === "uploading" || status === "streaming" ? (
        <span className="w-1.5 h-1.5 bg-current rounded-full mr-1.5 animate-pulse" />
      ) : null}
      {labels[status] || status}
    </span>
  );
}

function formatSize(size: number | string) {
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}