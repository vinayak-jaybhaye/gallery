import { useRef, useState, useEffect } from "react";
import { useUpload } from "@/hooks/useUpload";
import CameraCapture from "./CameraCapture";
import VideoCapture from "./VideoCapture";
import { Camera, Files, Video, Plus, X, Upload } from "lucide-react";

export default function UploadFAB() {
  const { uploadFile, loading, error } = useUpload();

  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [streamOn, setStreamOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear error after 3 seconds
  useEffect(() => {
    if (error) {
      setRecentError(error);
      const timer = setTimeout(() => setRecentError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
        // Upload first file
        // TODO:: allow multiple files
        const file = files[0];
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          uploadFile(file);
        }
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

    // Upload files
    Array.from(files).forEach((file) => {
      uploadFile(file);
    });

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

  const menuItems = [
    {
      label: "Upload photos or videos",
      icon: Files,
      iconBg: "bg-accent-soft",
      iconColor: "text-accent-primary",
      onClick: () => fileInputRef.current?.click(),
    },
    {
      label: "Take photo",
      icon: Camera,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-500",
      onClick: () => {
        setCameraOpen(true);
        setOpen(false);
      },
    },
    {
      label: "Record video",
      icon: Video,
      iconBg: "bg-red-500/15",
      iconColor: "text-red-500",
      onClick: () => {
        setStreamOn(true);
        setOpen(false);
      },
    },
  ];

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10 transition-opacity"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Menu */}
        <div
          className={`absolute bottom-20 right-0 transition-all duration-300 ${open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
            }`}
        >
          <div className="bg-surface-raised border border-border-subtle rounded-2xl shadow-2xl overflow-hidden min-w-[220px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-subtle bg-bg-muted/50">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Add to gallery
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-selected transition-colors text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${item.iconBg} flex items-center justify-center flex-shrink-0`}
                  >
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Drag hint (desktop only) */}
            <div className="hidden sm:block px-4 py-3 border-t border-border-subtle bg-bg-muted/30">
              <p className="text-xs text-text-muted text-center">
                Or drag and drop files anywhere
              </p>
            </div>
          </div>
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          disabled={loading}
          className={`cursor-pointer relative w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${open
            ? "bg-surface-raised text-text-primary rotate-45 scale-90"
            : "bg-accent-primary text-white hover:bg-accent-strong hover:scale-110 hover:shadow-2xl"
            } disabled:opacity-50 disabled:hover:scale-100`}
        >
          {loading ? (
            <svg className="animate-spin w-6 h-6 lg:w-7 lg:h-7" viewBox="0 0 24 24">
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
          ) : open ? (
            <X className="w-6 h-6 lg:w-7 lg:h-7" />
          ) : (
            <Plus className="w-6 h-6 lg:w-7 lg:h-7" />
          )}

          {/* Pulsing ring when idle */}
          {!open && !loading && (
            <span className="absolute inset-0 rounded-full bg-accent-primary animate-ping opacity-20" />
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
          <div className="absolute -top-16 right-0 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 shadow-lg">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-500">{recentError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input - Multiple files allowed */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
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