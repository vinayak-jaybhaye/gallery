import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MediaGrid from "@/components/gallery/MediaGrid";
import { Image, PlayCircle, LayoutGrid, Trash, Images, Unlink } from "lucide-react";
import {
  deleteMedia,
  getPublicLinksByMediaId,
  revokePublicShare,
  type MediaType,
} from "@/api/media";
import { getErrorMessage } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useMediaStore } from "@/store/mediaStore";
import { AlbumSelectionModal } from "@/components/albums";

type TabKey = MediaType | "all";

const tabs: { key: TabKey; label: string; icon: typeof Image; path: string }[] = [
  { key: "all", label: "All", icon: LayoutGrid, path: "/gallery" },
  { key: "image", label: "Images", icon: Image, path: "/images" },
  { key: "video", label: "Videos", icon: PlayCircle, path: "/videos" },
];

// Map path to media type
function getMediaTypeFromPath(pathname: string): MediaType | undefined {
  if (pathname.startsWith("/images")) return "image";
  if (pathname.startsWith("/videos")) return "video";
  return undefined; // "all" for /gallery
}

// Map path to active tab key
function getActiveTabFromPath(pathname: string): TabKey {
  if (pathname.startsWith("/images")) return "image";
  if (pathname.startsWith("/videos")) return "video";
  return "all";
}

export default function Gallery() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = getActiveTabFromPath(location.pathname);
  const mediaType = getMediaTypeFromPath(location.pathname);

  const { deleteMedia: deleteMediaFromStore } = useMediaStore();

  useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function handleMoveToTrash() {
    if (!selected.size) return;

    try {
      setError(null);
      setMessage(null);
      const ids = Array.from(selected);
      await deleteMedia(ids);

      // remove from UI immediately
      ids.forEach((id) => deleteMediaFromStore(id));

      setSelected(new Set());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to move selected media to trash."));
    }
  }

  function handleAddToAlbum() {
    if (!selected.size) return;
    setShowAlbumModal(true);
  }

  async function handleRevokePublicMedia() {
    if (!selected.size) return;

    try {
      setError(null);
      setMessage(null);
      const mediaIds = Array.from(selected);
      const links = await Promise.all(
        mediaIds.map((mediaId) => getPublicLinksByMediaId(mediaId))
      );
      const shareIds = Array.from(new Set(links.flat().map((link) => link.shareId)));

      if (shareIds.length === 0) {
        setMessage("No public shares found for selected media.");
        return;
      }

      await revokePublicShare(shareIds);
      setMessage(`Revoked ${shareIds.length} public share${shareIds.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to revoke shared media."));
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-bg-muted px-3 py-2 text-sm text-text-primary">
            {message}
          </div>
        )}
        <div className="sticky top-16 z-20 mb-6 bg-bg-app pb-4 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map(({ key, label, icon: Icon, path }) => (
              <button
                key={key}
                onClick={() => navigate(path)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === key
                  ? "bg-accent-soft text-accent-primary"
                  : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-surface-raised border border-border-subtle p-4 rounded-xl shadow-sm">
              <span className="text-text-primary font-medium">{selected.size} selected</span>

              <div className="hidden sm:block flex-1" />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleMoveToTrash}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-bg-destructive text-text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Trash className="w-4 h-4" />
                  <span className="hidden sm:inline">Move to Trash</span>
                </button>
                <button
                  onClick={handleAddToAlbum}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-bg-muted text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors"
                >
                  <Images className="w-4 h-4" />
                  <span className="hidden sm:inline">add to album</span>
                </button>
                <button
                  onClick={handleRevokePublicMedia}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-bg-muted text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors"
                >
                  <Unlink className="w-4 h-4" />
                  <span className="hidden sm:inline">revoke public links</span>
                </button>

                <button
                  onClick={() => setSelected(new Set())}
                  className="flex-1 sm:flex-none px-4 py-2 bg-bg-muted text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Media Grid */}
        <MediaGrid mediaType={mediaType} selected={selected} setSelected={setSelected} />
      </div>
      <Outlet />
      <AlbumSelectionModal
        open={showAlbumModal}
        mediaIds={Array.from(selected)}
        onClose={() => setShowAlbumModal(false)}
        onSuccess={() => setSelected(new Set())}
      />
    </>
  );
}