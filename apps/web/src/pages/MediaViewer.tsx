import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteMedia, getMedia, getPublicMedia } from "@/api/media";
import { ShareModal } from "@/components/media";
import MediaLightboxViewer, {
  type ViewerMedia,
} from "@/components/media/MediaLightboxViewer";
import { downloadMedia, getErrorMessage, normalizeMediaId } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useMediaStore } from "@/store/mediaStore";
import { ConfirmDialog } from "@/components/ui";

function getPublicMediaErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (status === 410) {
    return "This public link has expired.";
  }

  if (status === 404) {
    return "This public link is invalid or has been revoked.";
  }

  return getErrorMessage(error, "Failed to load this shared media. Please try again later.");
}

function getPrivateMediaErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (status === 404) {
    return "Media not found.";
  }

  if (status === 403) {
    return "You do not have access to this media.";
  }

  return getErrorMessage(error, "Failed to load media details.");
}

export default function MediaViewer() {
  const { mediaId, albumId, token } = useParams<{
    mediaId?: string;
    albumId?: string;
    token?: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();

  const {
    getMediaById,
    getMediaForQuery,
    enrichMedia,
    deleteMedia: removeFromStore,
  } = useMediaStore();

  const { user } = useAuthStore();

  const isPublicRoute = Boolean(token);
  const normalizedMediaId = normalizeMediaId(mediaId);

  const viewerBasePath = useMemo(() => {
    if (albumId) return `/albums/${albumId}`;
    if (location.pathname.startsWith("/images")) return "/images";
    if (location.pathname.startsWith("/videos")) return "/videos";
    return "/gallery";
  }, [albumId, location.pathname]);

  const queryKey = useMemo(() => {
    if (albumId) return `album:${albumId}:all`;
    if (viewerBasePath === "/images") return "myMedia:image";
    if (viewerBasePath === "/videos") return "myMedia:video";
    return "myMedia:all";
  }, [albumId, viewerBasePath]);

  const items = isPublicRoute ? [] : getMediaForQuery(queryKey);
  const media = normalizedMediaId ? getMediaById(normalizedMediaId) : null;

  const [detailLoading, setDetailLoading] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [publicMedia, setPublicMedia] = useState<ViewerMedia | null>(null);

  useEffect(() => {
    if (isPublicRoute) return;

    if (!normalizedMediaId) {
      if (mediaId) {
        setDetailError("Invalid media link.");
      }
      return;
    }

    const currentMediaId = normalizedMediaId;
    const existing = getMediaById(currentMediaId);
    if (existing?.originalUrl) {
      setDetailError(null);
      return;
    }

    async function fetchDetail() {
      try {
        setDetailLoading(true);
        setDetailError(null);
        const detail = await getMedia(currentMediaId);
        enrichMedia(detail);
      } catch (error) {
        setDetailError(getPrivateMediaErrorMessage(error));
      } finally {
        setDetailLoading(false);
      }
    }

    void fetchDetail();
  }, [enrichMedia, getMediaById, isPublicRoute, mediaId, normalizedMediaId]);

  useEffect(() => {
    if (!isPublicRoute || !token) return;

    const publicToken = token;

    async function fetchPublicMedia() {
      try {
        setPublicLoading(true);
        setPublicError(null);
        const detail = await getPublicMedia(publicToken);

        if (!detail.originalUrl) {
          setPublicMedia(null);
          setPublicError("Public media is unavailable.");
          return;
        }

        const mediaType: "image" | "video" = detail.mimeType.startsWith("video/")
          ? "video"
          : "image";

        setPublicMedia({
          id: detail.id || publicToken,
          type: mediaType,
          title: detail.title || "Shared media",
          originalUrl: detail.originalUrl,
          thumbnailUrl: detail.thumbnailUrl ?? detail.originalUrl,
          mimeType: detail.mimeType,
          sizeBytes: detail.sizeBytes,
          width: detail.width ?? undefined,
          height: detail.height ?? undefined,
          durationSeconds: detail.durationSeconds ?? undefined,
          takenAt: detail.takenAt
            ? new Date(detail.takenAt).toISOString()
            : undefined,
          createdAt: detail.createdAt
            ? new Date(detail.createdAt).toISOString()
            : undefined,
        });
      } catch (err) {
        setPublicMedia(null);
        setPublicError(getPublicMediaErrorMessage(err));
      } finally {
        setPublicLoading(false);
      }
    }

    void fetchPublicMedia();
  }, [isPublicRoute, token]);

  const viewerMedia = useMemo<ViewerMedia | null>(() => {
    if (isPublicRoute) {
      return publicMedia;
    }

    if (!media?.originalUrl) {
      return null;
    }

    return {
      id: media.id,
      ownerId: media.ownerId,
      type: media.type,
      title: media.title,
      originalUrl: media.originalUrl,
      thumbnailUrl: media.thumbnailUrl,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      durationSeconds: media.durationSeconds,
      takenAt: media.takenAt,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }, [isPublicRoute, media, publicMedia]);

  const currentIndex = !isPublicRoute && normalizedMediaId
    ? items.findIndex((item) => item.id === normalizedMediaId)
    : -1;

  const prev = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < items.length - 1
    ? items[currentIndex + 1]
    : null;

  const closeModal = useCallback(() => {
    if (isPublicRoute) {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }

      navigate("/login");
      return;
    }

    navigate(viewerBasePath);
  }, [isPublicRoute, navigate, viewerBasePath]);

  const goPrev = useCallback(() => {
    if (!prev) return;
    navigate(`${viewerBasePath}/${prev.id}`);
  }, [navigate, prev, viewerBasePath]);

  const goNext = useCallback(() => {
    if (!next) return;
    navigate(`${viewerBasePath}/${next.id}`);
  }, [navigate, next, viewerBasePath]);

  const handleDownload = useCallback(() => {
    if (!viewerMedia?.originalUrl) return;
    downloadMedia(viewerMedia.originalUrl, viewerMedia.title, viewerMedia.id, viewerMedia.sizeBytes);
  }, [viewerMedia]);

  const confirmDelete = useCallback(async () => {
    if (!media) return;

    try {
      setDeleting(true);
      setDetailError(null);
      await deleteMedia([media.id]);
      removeFromStore(media.id);
      setShowDeleteDialog(false);

      if (next) {
        navigate(`${viewerBasePath}/${next.id}`);
        return;
      }

      if (prev) {
        navigate(`${viewerBasePath}/${prev.id}`);
        return;
      }

      closeModal();
    } catch (err) {
      setDetailError(getErrorMessage(err, "Failed to move media to trash."));
    } finally {
      setDeleting(false);
    }
  }, [closeModal, media, navigate, next, prev, removeFromStore, viewerBasePath]);

  const canManagePrivateMedia = Boolean(
    !isPublicRoute && media && media.ownerId === user?.id,
  );

  const viewerError = isPublicRoute ? publicError : detailError;

  return (
    <MediaLightboxViewer
      media={viewerMedia}
      loading={isPublicRoute ? publicLoading : detailLoading}
      errorMessage={viewerError}
      onClose={closeModal}
      onDownload={viewerMedia ? handleDownload : undefined}
      onDelete={canManagePrivateMedia ? () => setShowDeleteDialog(true) : undefined}
      deleting={deleting}
      canDelete={canManagePrivateMedia}
      onShare={canManagePrivateMedia ? () => setShowShareModal(true) : undefined}
      canShare={canManagePrivateMedia}
      navigation={
        !isPublicRoute && currentIndex >= 0
          ? {
            hasPrev: Boolean(prev),
            hasNext: Boolean(next),
            currentIndex,
            total: items.length,
            onPrev: goPrev,
            onNext: goNext,
          }
          : undefined
      }
      overlayOpen={showShareModal}
      onOverlayEscape={() => setShowShareModal(false)}
    >
      {showShareModal && normalizedMediaId && (
        <ShareModal mediaId={normalizedMediaId} onClose={() => setShowShareModal(false)} />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Move this media to trash?"
        description="You can restore it from trash within 30 days."
        confirmLabel="Yes, move to trash"
        noLabel="No"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onNo={() => setShowDeleteDialog(false)}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </MediaLightboxViewer>
  );
}