import { useRef, useState, useEffect } from "react";
import { useUpload } from "@/hooks/useUpload";
import CameraCapture from "./CameraCapture";
import VideoCapture from "./VideoCapture";
import { Camera, Files, Video, Plus, X, Upload, ChevronRight, AlertCircle } from "lucide-react";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const ACCEPTED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
].join(",");

export default function UploadFAB() {
  const { uploadFile, loading, error } = useUpload();

  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [streamOn, setStreamOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function isValidUploadMimeType(file: File) {
    const mimeType = file.type.trim().toLowerCase();

    if (!mimeType) return false;

    if (mimeType.startsWith("image/")) {
      return ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
    }

    if (mimeType.startsWith("video/")) {
      return ALLOWED_VIDEO_MIME_TYPES.has(mimeType);
    }

    return false;
  }

  function toFriendlyUploadError(message: string) {
    const normalized = message.toLowerCase();

    if (
      normalized.includes("network")
      || normalized.includes("unable to reach server")
      || normalized.includes("failed to fetch")
    ) {
      return "Upload failed. Check your internet connection and try again.";
    }

    if (
      normalized.includes("413")
      || normalized.includes("too large")
      || normalized.includes("payload too large")
    ) {
      return "File is too large to upload.";
    }

    if (normalized.includes("invalid upload response")) {
      return "Upload failed due to an invalid server response. Please try again.";
    }

    if (
      normalized.includes("mimetype")
      && (normalized.includes("invalid") || normalized.includes("enum"))
    ) {
      return "Unsupported file format. Allowed: JPEG, PNG, WEBP, HEIC, MP4, MOV, WEBM.";
    }

    return message;
  }

  function showRecentError(message: string) {
    setRecentError(message);
  }

  function showInvalidMimeTypeError(count: number) {
    if (count <= 0) return;

    showRecentError(
      count === 1
        ? "1 file was skipped due to invalid or unsupported MIME type."
        : `${count} files were skipped due to invalid or unsupported MIME types.`
    );
  }

  // Display upload errors from the hook in user-friendly format.
  useEffect(() => {
    if (!error) return;
    showRecentError(toFriendlyUploadError(error));
  }, [error]);

  // Auto-dismiss toast errors after a short delay.
  useEffect(() => {
    if (!recentError) return;

    const hideTimer = window.setTimeout(() => {
      setRecentError(null);
    }, 4500);

    return () => window.clearTimeout(hideTimer);
  }, [recentError]);

  // Global drag and drop
  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      // Only set false if leaving the window
      if (e.relatedTarget === null) {
        setIsDragging(false);
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        let invalidMimeTypeCount = 0;

        Array.from(files).forEach((file) => {
          if (isValidUploadMimeType(file)) {
            uploadFile(file);
            return;
          }

          invalidMimeTypeCount += 1;
        });

        showInvalidMimeTypeError(invalidMimeTypeCount);
      }
    }

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [uploadFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let invalidMimeTypeCount = 0;

    Array.from(files).forEach((file) => {
      if (!isValidUploadMimeType(file)) {
        invalidMimeTypeCount += 1;
        return;
      }

      uploadFile(file);
    });

    showInvalidMimeTypeError(invalidMimeTypeCount);
    setOpen(false);
    e.target.value = ""; // Reset input
  }

  function handleCapture(blob: Blob) {
    const now = new Date();
    const title = `IMG_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.jpg`;

    const file = new File([blob], title, {
      type: "image/jpeg",
    });

    uploadFile(file);
  }

  function handleOpenCamera() {
    setCameraOpen(true);
    setOpen(false);
  }

  function handleOpenVideo() {
    setStreamOn(true);
    setOpen(false);
  }

  return (
    <>
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-[60] w-full h-full bg-accent-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          onClick={(e) => {
            e.stopPropagation();
            setIsDragging(false);
          }}
        >
          <div className="bg-surface-raised border-2 border-dashed border-accent-primary rounded-3xl p-12 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-accent-primary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Drop to upload
            </h3>
            <p className="text-text-secondary">Release to start uploading</p>
          </div>
        </div>
      )}

      {/* FAB Container */}
      <div className="fixed bottom-6 right-6 z-50 lg:bottom-8 lg:right-8">
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-[2px] -z-10 transition-opacity"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Upload Panel */}
        <div
          className={`absolute bottom-20 right-0 w-[min(92vw,360px)] origin-bottom-right transition-all duration-250 ${open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
            }`}
        >
          <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)]">
            <div className="max-h-[min(70vh,560px)] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-raised/95 px-5 py-4 backdrop-blur-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Quick Upload
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-text-primary">
                    Add media to gallery
                  </h3>
                </div>
                <button
                  aria-label="Close upload panel"
                  onClick={() => setOpen(false)}
                  className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 p-2.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group w-full rounded-2xl border border-transparent px-3.5 py-3 text-left transition-all hover:border-border-subtle hover:bg-bg-muted/55"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-primary">
                      <Files className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        Upload from device
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Choose photos or videos from your files
                      </p>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>

                <button
                  onClick={handleOpenCamera}
                  className="group w-full rounded-2xl border border-transparent px-3.5 py-3 text-left transition-all hover:border-border-subtle hover:bg-bg-muted/55"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        Take photo
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Open your camera and capture an image
                      </p>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>

                <button
                  onClick={handleOpenVideo}
                  className="group w-full rounded-2xl border border-transparent px-3.5 py-3 text-left transition-all hover:border-border-subtle hover:bg-bg-muted/55"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
                      <Video className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        Record video
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Start a quick video recording session
                      </p>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              </div>

              <div className="border-t border-border-subtle bg-bg-muted/30 px-5 py-3">
                <p className="text-center text-xs text-text-muted">
                  Tip: drag and drop files anywhere on the page
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          disabled={loading}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? "Close upload options" : "Open upload options"}
          className={`relative inline-flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition-all duration-200 sm:h-14 sm:w-auto sm:px-4 ${open
            ? "border-border-subtle bg-surface-raised text-text-primary"
            : "border-accent-strong/30 bg-accent-primary text-white hover:bg-accent-strong"
            } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {loading ? (
            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <>
              {open ? (
                <X className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </>
          )}

          {!loading && (
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/5" />
          )}
        </button>

        {/* Upload Status Toast */}
        {loading && (
          <div className="absolute -top-16 right-0 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-xl px-4 py-3 shadow-lg min-w-[180px]">
              <div className="relative">
                <svg className="animate-spin h-5 w-5 text-accent-primary" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Uploading...</p>
                <p className="text-xs text-text-muted">Please wait</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {recentError && !loading && (
          <div className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(92vw,360px)] animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div
              role="alert"
              className="rounded-xl border border-error/25 bg-error/10 px-3 py-2.5 shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" />
                <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-error">
                  {recentError}
                </p>
                <button
                  type="button"
                  aria-label="Dismiss upload error"
                  onClick={() => setRecentError(null)}
                  className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-error/80 transition-colors hover:bg-error/15 hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input - Multiple files allowed */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Camera Modal */}
      {cameraOpen && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Video Capture Modal */}
      {streamOn && <VideoCapture onClose={() => setStreamOn(false)} />}
    </>
  );
}