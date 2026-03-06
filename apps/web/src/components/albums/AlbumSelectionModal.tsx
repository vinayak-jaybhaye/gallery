import { useEffect, useState } from "react";
import { listAlbums, addMediaToAlbum, createAlbum, type AlbumListItem } from "@/api/albums";
import { X, Plus, Loader2, Images, Check } from "lucide-react";
import { Loader } from "@/components/ui";

export type AlbumSelectionModalProps = {
  open: boolean;
  mediaIds: string[];
  onClose: () => void;
  onSuccess?: (albumId: string, addedCount: number) => void;
};

export default function AlbumSelectionModal({
  open,
  mediaIds,
  onClose,
  onSuccess,
}: AlbumSelectionModalProps) {
  const [albums, setAlbums] = useState<AlbumListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // albumId currently being added to
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Inline create
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

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

  // Fetch albums when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listAlbums({ limit: 50, search: search || undefined })
      .then((res) =>
        setAlbums(
          res.items.filter(
            (album) => album.userRole === "owner" || album.userRole === "editor"
          )
        )
      )
      .catch((err) => setError(err?.message || "Failed to load albums"))
      .finally(() => setLoading(false));
  }, [open, search]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setShowCreate(false);
      setNewTitle("");
      setError(null);
      setMessage(null);
      setAdding(null);
      setSelectedAlbumId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedAlbumId) return;
    const selectedStillVisible = albums.some((album) => album.id === selectedAlbumId);
    if (!selectedStillVisible) {
      setSelectedAlbumId(null);
    }
  }, [albums, selectedAlbumId]);

  if (!open) return null;

  function handleSelect(albumId: string) {
    setSelectedAlbumId(albumId);
    setError(null);
    setMessage(null);
  }

  async function handleConfirmAdd() {
    if (!selectedAlbumId) return;

    const albumId = selectedAlbumId;
    setAdding(albumId);
    setError(null);
    setMessage(null);
    try {
      const result = await addMediaToAlbum(albumId, mediaIds);
      onSuccess?.(albumId, result.addedCount);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to add media to album");
    } finally {
      setAdding(null);
    }
  }

  async function handleCreate(e: React.SubmitEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const album = await createAlbum({ title: newTitle.trim() });
      // Immediately add media to the new album
      const result = await addMediaToAlbum(album.id, mediaIds);
      onSuccess?.(album.id, result.addedCount);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create album");
    } finally {
      setCreating(false);
    }
  }

  const isDisabled = !!adding || creating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDisabled) onClose();
      }}
    >
      <div className="bg-surface-raised border border-border-subtle rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-accent-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Add to Album
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDisabled}
            className="p-1 rounded-lg text-text-secondary hover:bg-bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Create */}
        <div className="px-5 pt-4 pb-2 space-y-3">
          <input
            type="text"
            placeholder="Search albums…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg-muted text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
            disabled={isDisabled}
          />

          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              disabled={isDisabled}
              className="flex items-center gap-2 text-sm text-accent-primary hover:text-accent-strong transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create new album
            </button>
          ) : (
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Album title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border-subtle bg-bg-muted text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                required
                minLength={1}
                maxLength={255}
                autoFocus
                disabled={creating}
              />
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-strong transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create & Add"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle("");
                }}
                disabled={creating}
                className="px-2 py-2 rounded-lg text-text-secondary hover:bg-bg-muted text-sm transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-bg-destructive text-text-destructive-foreground text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-bg-muted text-text-primary text-sm">
            {message}
          </div>
        )}

        {/* Album list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader size="md" label="Loading albums..." />
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              {search
                ? "No editable albums match your search."
                : "No editable albums yet. Create one above!"}
            </div>
          ) : (
            <ul className="space-y-1">
              {albums.map((album) => (
                <li key={album.id}>
                  <button
                    onClick={() => handleSelect(album.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors disabled:opacity-50 text-left group ${selectedAlbumId === album.id
                      ? "bg-bg-muted ring-1 ring-accent-primary/40"
                      : "hover:bg-bg-muted"
                      }`}
                  >
                    {/* Cover thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-bg-muted border border-border-subtle overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {album.coverMediaUrl ? (
                        <img
                          src={album.coverMediaUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Images className="w-5 h-5 text-text-secondary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {album.title}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {album.count} {album.count === 1 ? "item" : "items"}
                      </p>
                    </div>

                    {/* Loading / check indicator */}
                    {adding === album.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent-primary flex-shrink-0" />
                    ) : (
                      <Check
                        className={`w-4 h-4 transition-opacity flex-shrink-0 ${selectedAlbumId === album.id
                          ? "text-accent-primary opacity-100"
                          : "text-text-secondary opacity-0 group-hover:opacity-100"
                          }`}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle space-y-2">
          <div className="text-xs text-text-secondary text-center">
            {mediaIds.length} {mediaIds.length === 1 ? "item" : "items"} selected
          </div>
          <button
            onClick={onClose}
            disabled={isDisabled}
            type="button"
            className="w-full px-3 py-2 rounded-lg bg-bg-destructive text-text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmAdd}
            disabled={isDisabled || !selectedAlbumId}
            className="w-full px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding
              ? "Adding..."
              : selectedAlbumId
                ? "Add to selected album"
                : "Select an album to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}