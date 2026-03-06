import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Images, ImageOff, MoreVertical, ShieldCheck, Trash2, Users, X } from "lucide-react";
import {
  getAlbumById,
  removeMediaFromAlbum,
  updateAlbum,
} from "@/api/albums";
import MediaGrid from "@/components/gallery/MediaGrid";
import { AlbumPeopleModal } from "@/components/albums";
import { useAlbumStore } from "@/store/albumStore";
import { useMediaStore } from "@/store/mediaStore";

function getAlbumMediaQueryKey(albumId: string, mediaType?: "image" | "video") {
  return `album:${albumId}:${mediaType ?? "all"}`;
}

const FEEDBACK_TIMEOUT_MS = 4000;

export default function AlbumDetails() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [titleDraft, setTitleDraft] = useState("");
  const [actionLoading, setActionLoading] = useState<"title" | "cover" | "remove" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const album = useAlbumStore((s) => (albumId ? s.getAlbumById(albumId) : null));
  const enrichAlbum = useAlbumStore((s) => s.enrichAlbum);
  const clearAlbumMedia = useAlbumStore((s) => s.clearAlbumMedia);
  const clearMediaQuery = useMediaStore((s) => s.clearQuery);

  const canManageAlbum = album?.userRole === "owner" || album?.userRole === "editor";
  const albumRole = (album?.userRole ?? "viewer") as "owner" | "viewer" | "editor";

  const refreshAlbum = useCallback(async () => {
    const id = albumId;
    if (!id) return;

    try {
      setLoading(true);
      setLoadError(null);
      const fresh = await getAlbumById(id);
      enrichAlbum(fresh);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load album.");
    } finally {
      setLoading(false);
    }
  }, [albumId, enrichAlbum]);

  useEffect(() => {
    void refreshAlbum();
  }, [refreshAlbum]);

  useEffect(() => {
    setTitleDraft(album?.title ?? "");
  }, [album?.id, album?.title]);

  useEffect(() => {
    if (!canManageAlbum) {
      setSelected(new Set());
    }
  }, [canManageAlbum]);

  useEffect(() => {
    if (!showOptionsModal) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowOptionsModal(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showOptionsModal]);

  useEffect(() => {
    if (!loadError) return;
    const timer = window.setTimeout(() => setLoadError(null), FEEDBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [loadError]);

  useEffect(() => {
    if (!actionError) return;
    const timer = window.setTimeout(() => setActionError(null), FEEDBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [actionError]);

  useEffect(() => {
    if (!actionSuccess) return;
    const timer = window.setTimeout(() => setActionSuccess(null), FEEDBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [actionSuccess]);

  function clearActionFeedback() {
    setActionError(null);
    setActionSuccess(null);
  }

  async function handleSaveTitle() {
    if (!albumId || !canManageAlbum) return;

    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setActionError("Album name cannot be empty.");
      setActionSuccess(null);
      return;
    }

    if (nextTitle === album?.title) return;

    try {
      setActionLoading("title");
      clearActionFeedback();
      await updateAlbum(albumId, { title: nextTitle });
      await refreshAlbum();
      setActionSuccess("Album name updated.");
    } catch (err: any) {
      setActionError(err?.message || "Failed to update album name.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSetCoverFromSelection() {
    if (!albumId || !canManageAlbum || selected.size !== 1) return;

    const [coverMediaId] = Array.from(selected);

    try {
      setActionLoading("cover");
      clearActionFeedback();
      await updateAlbum(albumId, { coverMediaId });
      await refreshAlbum();
      setActionSuccess("Album cover updated.");
    } catch (err: any) {
      setActionError(err?.message || "Failed to update album cover.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClearCover() {
    if (!albumId || !canManageAlbum) return;

    try {
      setActionLoading("cover");
      clearActionFeedback();
      await updateAlbum(albumId, { coverMediaId: null });
      await refreshAlbum();
      setActionSuccess("Album cover removed.");
    } catch (err: any) {
      setActionError(err?.message || "Failed to clear album cover.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveSelectedMedia() {
    if (!albumId || !canManageAlbum || selected.size === 0) return;

    const mediaIds = Array.from(selected);
    const confirmation = `Remove ${mediaIds.length} selected ${mediaIds.length === 1 ? "item" : "items"} from this album?`;
    if (!window.confirm(confirmation)) return;

    try {
      setActionLoading("remove");
      clearActionFeedback();
      const result = await removeMediaFromAlbum(albumId, mediaIds);

      setSelected(new Set());
      clearMediaQuery(getAlbumMediaQueryKey(albumId));
      clearMediaQuery(getAlbumMediaQueryKey(albumId, "image"));
      clearMediaQuery(getAlbumMediaQueryKey(albumId, "video"));
      clearAlbumMedia(albumId);
      clearAlbumMedia(albumId, "image");
      clearAlbumMedia(albumId, "video");

      await refreshAlbum();
      setActionSuccess(`Removed ${result.removedCount} ${result.removedCount === 1 ? "item" : "items"} from album.`);
    } catch (err: any) {
      setActionError(err?.message || "Failed to remove media from album.");
    } finally {
      setActionLoading(null);
    }
  }

  if (!albumId) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-text-secondary">Album not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <div className="overflow-hidden rounded-2xl border border-border-subtle shadow-sm">
            <div className="relative min-h-[220px] sm:min-h-[260px]">
              {album?.coverMediaUrl ? (
                <img
                  src={album.coverMediaUrl}
                  alt={album.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/45 to-black/25" />

              <div className="relative flex min-h-[220px] flex-col justify-between p-4 sm:min-h-[260px] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => navigate("/albums")}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-black/40"
                    title="Back to albums"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to albums
                  </button>

                  <button
                    onClick={() => setShowOptionsModal(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40"
                    title="Album options"
                    aria-label="Album options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">
                      {album?.title ?? "Album"}
                    </h1>
                    {loading && <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs text-white/90">Loading...</span>}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/90">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                      <Images className="h-3.5 w-3.5" />
                      {album?.count ?? "—"} items
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Created {album ? new Date(album.createdAt).toLocaleDateString() : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 font-medium capitalize backdrop-blur-sm">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {albumRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {loadError && (
          <div className="mb-4 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
            {loadError}
          </div>
        )}

        {!showOptionsModal && actionError && (
          <div className="mb-4 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
            {actionError}
          </div>
        )}

        {!showOptionsModal && actionSuccess && (
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            {actionSuccess}
          </div>
        )}

        {canManageAlbum && selected.size > 0 && (
          <div className="sticky top-16 z-20 mb-4 bg-bg-app pb-3 pt-2">
            <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-raised p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-text-primary">
                {selected.size} {selected.size === 1 ? "item" : "items"} selected
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetCoverFromSelection}
                  disabled={actionLoading !== null || selected.size !== 1}
                  className="inline-flex items-center justify-center rounded-lg bg-bg-muted px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-selected disabled:opacity-50"
                >
                  Set as Cover
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelectedMedia}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {actionLoading === "remove" ? "Removing..." : "Remove from Album"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center justify-center rounded-lg bg-bg-muted px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-selected disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <MediaGrid
          scope={{ type: "album", albumId }}
          viewerBasePath={`/albums/${albumId}`}
          selected={canManageAlbum ? selected : undefined}
          setSelected={canManageAlbum ? setSelected : undefined}
        />
      </div>

      {showOptionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOptionsModal(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Album Options</h2>
                <p className="text-xs text-text-secondary">Manage album name, cover, and members.</p>
              </div>
              <button
                onClick={() => setShowOptionsModal(false)}
                className="rounded-lg p-1 text-text-secondary transition hover:bg-bg-muted"
                aria-label="Close album options"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-muted px-3 py-2 text-sm text-text-primary transition hover:bg-surface-selected"
                onClick={() => {
                  setShowOptionsModal(false);
                  setShowUsersModal(true);
                }}
              >
                <Users className="h-4 w-4" />
                Album members
              </button>

              {canManageAlbum ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-primary">Change album name</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={titleDraft}
                        onChange={(e) => {
                          setTitleDraft(e.target.value);
                          if (actionError) setActionError(null);
                        }}
                        maxLength={255}
                        placeholder="Album name"
                        className="w-full rounded-lg border border-border-subtle bg-bg-muted px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        disabled={actionLoading !== null}
                      />
                      <button
                        type="button"
                        onClick={handleSaveTitle}
                        disabled={actionLoading !== null || !titleDraft.trim() || titleDraft.trim() === (album?.title ?? "")}
                        className="inline-flex items-center justify-center rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-50"
                      >
                        {actionLoading === "title" ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCover}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-bg-muted px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-selected disabled:opacity-50"
                  >
                    <ImageOff className="h-4 w-4" />
                    {actionLoading === "cover" ? "Updating..." : "Clear cover image"}
                  </button>

                  <p className="text-xs text-text-secondary">
                    To set a new cover image, select one item in the grid and use the selection action bar.
                  </p>
                </>
              ) : (
                <p className="text-xs text-text-secondary">
                  You can view album members, but only owners and editors can rename or clear cover.
                </p>
              )}

              {actionError && (
                <div className="rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
                  {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                  {actionSuccess}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlbumPeopleModal
        open={showUsersModal}
        onClose={() => setShowUsersModal(false)}
        album={album}
      />

      <Outlet />
    </>
  );
}