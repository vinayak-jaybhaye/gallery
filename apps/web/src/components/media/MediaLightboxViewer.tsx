import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  Share,
  AlertCircle,
} from "lucide-react";

export type ViewerMedia = {
  id: string;
  ownerId?: string;
  type: "image" | "video";
  title: string;
  originalUrl: string;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  takenAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MediaViewerNavigation = {
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

export type MediaLightboxViewerProps = {
  media: ViewerMedia | null;
  loading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  canDelete?: boolean;
  canShare?: boolean;
  deleting?: boolean;
  navigation?: MediaViewerNavigation;
  overlayOpen?: boolean;
  onOverlayEscape?: () => void;
  children?: ReactNode;
};

export default function MediaLightboxViewer({
  media,
  loading = false,
  errorMessage = null,
  onClose,
  onDownload,
  onDelete,
  onShare,
  canDelete = false,
  canShare = false,
  deleting = false,
  navigation,
  overlayOpen = false,
  onOverlayEscape,
  children,
}: MediaLightboxViewerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const swipeCurrentRef = useRef<{ x: number; y: number } | null>(null);

  const hasPrev = Boolean(navigation?.hasPrev);
  const hasNext = Boolean(navigation?.hasNext);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleSwipeStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!navigation || overlayOpen || showInfo || zoom !== 1) return;
    if (e.touches.length !== 1) {
      swipeStartRef.current = null;
      swipeCurrentRef.current = null;
      return;
    }

    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, ts: Date.now() };
    swipeCurrentRef.current = { x: touch.clientX, y: touch.clientY };
  }, [navigation, overlayOpen, showInfo, zoom]);

  const handleSwipeMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeCurrentRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleSwipeEnd = useCallback(() => {
    if (!navigation || !swipeStartRef.current || !swipeCurrentRef.current) {
      swipeStartRef.current = null;
      swipeCurrentRef.current = null;
      return;
    }

    const SWIPE_MIN_DISTANCE = 48;
    const SWIPE_MAX_VERTICAL_DRIFT = 72;
    const SWIPE_MAX_DURATION_MS = 700;

    const { x: startX, y: startY, ts } = swipeStartRef.current;
    const { x: endX, y: endY } = swipeCurrentRef.current;
    const dx = endX - startX;
    const dy = endY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const duration = Date.now() - ts;

    if (
      duration <= SWIPE_MAX_DURATION_MS &&
      absX >= SWIPE_MIN_DISTANCE &&
      absY <= SWIPE_MAX_VERTICAL_DRIFT &&
      absX > absY
    ) {
      if (dx < 0 && navigation.hasNext) {
        navigation.onNext();
      } else if (dx > 0 && navigation.hasPrev) {
        navigation.onPrev();
      }
    }

    swipeStartRef.current = null;
    swipeCurrentRef.current = null;
  }, [navigation]);

  const handleSwipeCancel = useCallback(() => {
    swipeStartRef.current = null;
    swipeCurrentRef.current = null;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen();
      return;
    }

    void document.exitFullscreen();
  }, []);

  // Reset transforms when media changes.
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [media?.id]);

  useEffect(() => {
    function handleMouseMove() {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        if (!showInfo && !overlayOpen) {
          setShowControls(false);
        }
      }, 3000);
    }

    if (showInfo || overlayOpen) {
      setShowControls(true);
    }

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [overlayOpen, showInfo]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (overlayOpen) {
        if (e.key === "Escape") {
          onOverlayEscape?.();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        if (navigation?.hasPrev) {
          navigation.onPrev();
        }
      }

      if (e.key === "ArrowRight") {
        if (navigation?.hasNext) {
          navigation.onNext();
        }
      }

      if (e.key === "Escape") onClose();
      if (e.key === "i" || e.key === "I") setShowInfo((s) => !s);
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "r" || e.key === "R") handleRotate();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleRotate,
    handleZoomIn,
    handleZoomOut,
    navigation,
    onClose,
    onOverlayEscape,
    overlayOpen,
    toggleFullscreen,
  ]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex bg-black"
      onClick={onClose}
    >
      <div
        className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-white/10 sm:p-2"
            title="Close (Esc)"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          <div className="min-w-0 flex-1 px-1 text-center sm:px-4">
            {media && (
              <h2 className="mx-auto block w-full max-w-[52vw] truncate text-xs font-medium text-white sm:max-w-md sm:text-base">
                {media.title}
              </h2>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-0.5 sm:gap-1">
            {media?.type === "image" && (
              <div className="hidden items-center gap-1 sm:flex">
                <button
                  onClick={handleZoomOut}
                  className="rounded-full p-2 transition-colors hover:bg-white/10"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="h-5 w-5 text-white" />
                </button>
                <span className="min-w-[3rem] text-center text-sm text-white">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="rounded-full p-2 transition-colors hover:bg-white/10"
                  title="Zoom in (+)"
                >
                  <ZoomIn className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={handleRotate}
                  className="rounded-full p-2 transition-colors hover:bg-white/10"
                  title="Rotate (R)"
                >
                  <RotateCw className="h-5 w-5 text-white" />
                </button>
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              className="hidden rounded-full p-2 transition-colors hover:bg-white/10 sm:block"
              title="Fullscreen (F)"
            >
              <Maximize2 className="h-5 w-5 text-white" />
            </button>

            {onDownload && (
              <button
                onClick={onDownload}
                className="rounded-full p-2 transition-colors hover:bg-white/10"
                title="Download"
              >
                <Download className="h-5 w-5 text-white" />
              </button>
            )}

            {canDelete && onDelete && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="rounded-full p-2 transition-colors hover:bg-white/10 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-5 w-5 text-white" />
              </button>
            )}

            <button
              onClick={() => setShowInfo((s) => !s)}
              className={`rounded-full p-2 transition-colors ${showInfo ? "bg-white/20" : "hover:bg-white/10"}`}
              title="Info (I)"
            >
              <Info className="h-5 w-5 text-white" />
            </button>

            {canShare && onShare && (
              <button
                onClick={onShare}
                className="rounded-full p-2 transition-colors hover:bg-white/10"
                title="Share"
              >
                <Share className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {children}

      <div className="relative flex flex-1 items-center justify-center">
        {hasPrev && navigation && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigation.onPrev();
            }}
            className={`group absolute left-0 top-0 z-20 hidden h-full w-14 items-center justify-start pl-2 transition-opacity duration-300 sm:flex sm:w-20 sm:pl-3 lg:w-24 lg:pl-4 ${showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          >
            <div className="rounded-full bg-black/50 p-2.5 opacity-100 backdrop-blur-sm transition sm:p-3 sm:opacity-0 sm:group-hover:opacity-100">
              <ArrowLeft className="h-6 w-6 text-white" />
            </div>
          </button>
        )}

        <div
          className="relative z-10 flex h-full w-full items-center justify-center p-2 sm:p-4"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleSwipeStart}
          onTouchMove={handleSwipeMove}
          onTouchEnd={handleSwipeEnd}
          onTouchCancel={handleSwipeCancel}
        >
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <span className="text-sm text-white/70">Loading...</span>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Unable to load media</span>
              </div>
              <p className="text-sm text-red-200">{errorMessage}</p>
            </div>
          )}

          {media && !loading && (
            <>
              {media.type === "image" ? (
                <div
                  className="flex h-full w-full max-h-full max-w-full items-center justify-center overflow-auto"
                >
                  <img
                    src={media.originalUrl}
                    alt={media.title}
                    className="max-h-[calc(100dvh-7rem)] rounded-lg object-contain transition-transform duration-200 sm:max-h-[calc(100vh-8rem)]"
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
                  className="max-h-[calc(100dvh-7rem)] max-w-full rounded-lg sm:max-h-[calc(100vh-8rem)]"
                />
              )}
            </>
          )}
        </div>

        {hasNext && navigation && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigation.onNext();
            }}
            className={`group absolute right-0 top-0 z-20 hidden h-full w-14 items-center justify-end pr-2 transition-opacity duration-300 sm:flex sm:w-20 sm:pr-3 lg:w-24 lg:pr-4 ${showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          >
            <div className="rounded-full bg-black/50 p-2.5 opacity-100 backdrop-blur-sm transition sm:p-3 sm:opacity-0 sm:group-hover:opacity-100">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
          </button>
        )}

        {navigation && navigation.total > 1 && (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
          >
            {navigation.currentIndex + 1} / {navigation.total}
          </div>
        )}
      </div>

      {showInfo && (
        <div
          className="fixed inset-0 z-[35] lg:hidden"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(false);
          }}
        />
      )}

      <div
        className={`
          absolute top-0 right-0 z-40 h-full w-full max-w-[22rem] transform overflow-hidden border-l border-white/10 bg-gray-900/95 backdrop-blur-sm transition-all duration-300 sm:w-80
          ${showInfo ? "translate-x-0" : "translate-x-full"}
          lg:relative lg:z-auto lg:shrink-0 lg:translate-x-0
          ${showInfo ? "lg:w-80" : "lg:w-0 lg:border-l-0"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Details</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="rounded-full p-1.5 transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {media && (
            <div className="space-y-6">
              <div className="aspect-video overflow-hidden rounded-lg bg-black/50">
                <img
                  src={media.thumbnailUrl ?? media.originalUrl}
                  alt={media.title}
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <h4 className="break-words text-base font-medium text-white">
                  {media.title}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
                    {media.type === "image" ? (
                      <ImageIcon className="h-3.5 w-3.5" />
                    ) : (
                      <Film className="h-3.5 w-3.5" />
                    )}
                    <span>Type</span>
                  </div>
                  <p className="text-sm capitalize text-white">{media.type}</p>
                </div>

                {typeof media.sizeBytes === "number" && (
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>Size</span>
                    </div>
                    <p className="text-sm text-white">{formatSize(media.sizeBytes)}</p>
                  </div>
                )}

                {typeof media.width === "number" && typeof media.height === "number" && (
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Dimensions</span>
                    </div>
                    <p className="text-sm text-white">
                      {media.width} x {media.height}
                    </p>
                  </div>
                )}

                {media.type === "video" && typeof media.durationSeconds === "number" && (
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Duration</span>
                    </div>
                    <p className="text-sm text-white">
                      {formatDuration(media.durationSeconds)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {media.mimeType && (
                  <InfoRow
                    icon={<FileType className="h-4 w-4" />}
                    label="Format"
                    value={media.mimeType}
                  />
                )}

                {media.takenAt && (
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Taken"
                    value={formatDate(media.takenAt)}
                  />
                )}

                {media.createdAt && (
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Uploaded"
                    value={formatDate(media.createdAt)}
                  />
                )}

                {media.updatedAt && media.updatedAt !== media.createdAt && (
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Modified"
                    value={formatDate(media.updatedAt)}
                  />
                )}
              </div>

              {(onDownload || (canDelete && onDelete)) && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm text-white transition-colors hover:bg-white/10"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download original</span>
                    </button>
                  )}

                  {canDelete && onDelete && (
                    <button
                      onClick={onDelete}
                      disabled={deleting}
                      className="flex w-full items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{deleting ? "Moving to trash..." : "Move to trash"}</span>
                    </button>
                  )}
                </div>
              )}
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-white/50">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/50">{label}</p>
        <p className="break-words text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
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