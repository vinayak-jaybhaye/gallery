import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMedia, deleteMedia } from "@/api/media";
import { useMediaStore } from "@/store/mediaStore";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Info,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Calendar,
  HardDrive,
  ImageIcon,
  Film,
  Clock,
  FileType,
} from "lucide-react";

export default function MediaViewer() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();

  const {
    getMediaById,
    getMediaForQuery,
    enrichMedia,
    deleteMedia: removeFromStore,
  } = useMediaStore();

  // Get all items for navigation
  const items = getMediaForQuery("all");

  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const media = mediaId ? getMediaById(mediaId) : null;

  // Fetch detail only if not enriched
  useEffect(() => {
    if (!mediaId) return;

    const existing = getMediaById(mediaId);

    if (existing?.originalUrl) return;

    async function fetchDetail() {
      try {
        setLoading(true);
        const detail = await getMedia(mediaId!);
        enrichMedia(detail);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [mediaId]);

  // Reset zoom/rotation on media change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [mediaId]);

  // Auto-hide controls
  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showInfo) setShowControls(false);
      }, 3000);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showInfo]);

  function closeModal() {
    navigate("/gallery");
  }

  // Prev / Next logic
  const currentIndex = mediaId
    ? items.findIndex((m) => m.id === mediaId)
    : -1;

  const prev = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next =
    currentIndex !== -1 && currentIndex < items.length - 1
      ? items[currentIndex + 1]
      : null;

  function goPrev() {
    if (prev) navigate(`/gallery/${prev.id}`);
  }

  function goNext() {
    if (next) navigate(`/gallery/${next.id}`);
  }

  function handleZoomIn() {
    setZoom((z) => Math.min(z + 0.25, 3));
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }

  function handleRotate() {
    setRotation((r) => (r + 90) % 360);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  async function handleDownload() {
    if (!media?.originalUrl) return;

    try {
      const response = await fetch(media.originalUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = media.title || `media-${media.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  }

  async function handleDelete() {
    if (!media) return;
    if (!confirm("Move this item to trash?")) return;

    try {
      setDeleting(true);
      await deleteMedia([media.id]);
      removeFromStore(media.id);

      // Navigate to next/prev or close
      if (next) {
        navigate(`/gallery/${next.id}`);
      } else if (prev) {
        navigate(`/gallery/${prev.id}`);
      } else {
        closeModal();
      }
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleting(false);
    }
  }

  // Arrow key navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closeModal();
      if (e.key === "i" || e.key === "I") setShowInfo((s) => !s);
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "r" || e.key === "R") handleRotate();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex z-50"
      onClick={closeModal}
    >
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4">
          <button
            onClick={closeModal}
            className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="flex-1 text-center px-4">
            {media && (
              <h2 className="text-white font-medium truncate max-w-md mx-auto">
                {media.title}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-1">
            {media?.type === "image" && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="w-5 h-5 text-white" />
                </button>
                <span className="text-white text-sm min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors"
                  title="Zoom in (+)"
                >
                  <ZoomIn className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleRotate}
                  className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors"
                  title="Rotate (R)"
                >
                  <RotateCw className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            <button
              onClick={toggleFullscreen}
              className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Fullscreen (F)"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDownload}
              className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowInfo((s) => !s)}
              className={`cursor-pointer p-2 rounded-full transition-colors ${showInfo ? "bg-white/20" : "hover:bg-white/10"
                }`}
              title="Info (I)"
            >
              <Info className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* LEFT CLICK ZONE */}
        {prev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className={`absolute left-0 top-0 h-full w-24 sm:w-32 flex items-center justify-start pl-4 group cursor-pointer z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"
              }`}
          >
            <div className="p-3 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
              <ArrowLeft className="w-6 h-6 text-white" />
            </div>
          </button>
        )}

        {/* MEDIA */}
        <div
          className="relative z-10 flex items-center justify-center w-full h-full p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white/70 text-sm">Loading...</span>
            </div>
          )}

          {media && !loading && (
            <>
              {media.type === "image" ? (
                <div
                  className="max-w-full max-h-full overflow-auto flex items-center justify-center"
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <img
                    src={media.originalUrl}
                    alt={media.title}
                    className="max-h-[calc(100vh-8rem)] rounded-lg object-contain transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                    draggable={false}
                  />
                </div>
              ) : (
                <video
                  src={media.originalUrl}
                  controls
                  autoPlay
                  className="max-h-[calc(100vh-8rem)] max-w-full rounded-lg"
                />
              )}
            </>
          )}
        </div>

        {/* RIGHT CLICK ZONE */}
        {next && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className={`absolute right-0 top-0 h-full w-24 sm:w-32 flex items-center justify-end pr-4 group cursor-pointer z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"
              }`}
          >
            <div className="p-3 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </button>
        )}

        {/* Position indicator */}
        {items.length > 1 && (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"
              }`}
          >
            {currentIndex + 1} / {items.length}
          </div>
        )}
      </div>

      {/* Info Panel Backdrop (mobile only) */}
      {showInfo && (
        <div
          className="fixed inset-0 z-35 lg:hidden"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(false);
          }}
        />
      )}

      {/* Info Panel */}
      <div
        className={`
          bg-gray-900/95 backdrop-blur-sm border-l border-white/10 transition-all duration-300 overflow-hidden
          absolute top-0 right-0 h-full w-80 z-40 transform
          ${showInfo ? "translate-x-0" : "translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto lg:shrink-0
          ${showInfo ? "lg:w-80" : "lg:w-0 lg:border-l-0"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full overflow-y-auto p-6 lg:mt-12 w-80">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg">Details</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {media && (
            <div className="space-y-6">
              {/* Thumbnail preview */}
              <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
                <img
                  src={media.thumbnailUrl || media.originalUrl}
                  alt={media.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Title */}
              <div>
                <h4 className="text-white font-medium text-base break-words">
                  {media.title}
                </h4>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                    {media.type === "image" ? (
                      <ImageIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Film className="w-3.5 h-3.5" />
                    )}
                    <span>Type</span>
                  </div>
                  <p className="text-white text-sm capitalize">{media.type}</p>
                </div>

                {media.sizeBytes && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Size</span>
                    </div>
                    <p className="text-white text-sm">{formatSize(media.sizeBytes)}</p>
                  </div>
                )}

                {media.width && media.height && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Dimensions</span>
                    </div>
                    <p className="text-white text-sm">
                      {media.width} × {media.height}
                    </p>
                  </div>
                )}

                {media.type === "video" && media.durationSeconds && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Duration</span>
                    </div>
                    <p className="text-white text-sm">
                      {formatDuration(media.durationSeconds)}
                    </p>
                  </div>
                )}
              </div>

              {/* Detailed info */}
              <div className="space-y-4">
                {media.mimeType && (
                  <InfoRow
                    icon={<FileType className="w-4 h-4" />}
                    label="Format"
                    value={media.mimeType}
                  />
                )}

                {media.takenAt && (
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Taken"
                    value={formatDate(media.takenAt)}
                  />
                )}

                <InfoRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Uploaded"
                  value={formatDate(media.createdAt)}
                />

                {media.updatedAt && media.updatedAt !== media.createdAt && (
                  <InfoRow
                    icon={<Clock className="w-4 h-4" />}
                    label="Modified"
                    value={formatDate(media.updatedAt)}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button
                  onClick={handleDownload}
                  className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download original</span>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? "Moving to trash..." : "Move to trash"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-white/50 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-xs">{label}</p>
        <p className="text-white text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}