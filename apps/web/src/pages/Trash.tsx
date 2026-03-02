import { useEffect, useState } from "react";
import {
  listDeletedMedia,
  recoverMedia,
  deleteFromTrash,
  emptyTrash,
  type TrashItem,
} from "@/api/media";

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    const data = await listDeletedMedia();
    setItems(data.items);
    setNextCursor(data.nextCursor);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);

    const data = await listDeletedMedia(nextCursor);

    setItems((prev) => [...prev, ...data.items]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  }

  async function handleRecover() {
    if (!selected.size) return;
    setActionLoading("recover");

    const ids = Array.from(selected);
    await recoverMedia(ids);

    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
    setActionLoading(null);
  }

  async function handleDeletePermanent() {
    if (!selected.size) return;
    setActionLoading("delete");

    const ids = Array.from(selected);
    await deleteFromTrash(ids);

    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
    setActionLoading(null);
  }

  async function handleEmptyTrash() {
    if (!confirm("Are you sure you want to permanently delete all items in trash?")) return;
    setActionLoading("empty");

    await emptyTrash();
    setItems([]);
    setSelected(new Set());
    setNextCursor(undefined);
    setActionLoading(null);
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-bg-app">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">Trash</h1>
            <p className="text-text-secondary text-sm mt-1">
              Items in trash will be permanently deleted after 30 days
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={actionLoading === "empty"}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-bg-muted text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              {actionLoading === "empty" ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Empty Trash
            </button>
          )}
        </div>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-bg-muted flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-text-secondary font-medium mb-1">Trash is empty</p>
            <p className="text-text-muted text-sm">Deleted items will appear here</p>
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Selection Action Bar */}
            {selected.size > 0 && (
              <div className="mb-6 flex items-center gap-4 bg-surface-raised border border-border-subtle p-4 rounded-xl shadow-sm">
                <span className="text-text-primary font-medium">{selected.size} selected</span>

                <div className="flex-1" />

                <button
                  onClick={handleRecover}
                  disabled={actionLoading === "recover"}
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {actionLoading === "recover" ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Recover
                </button>

                <button
                  onClick={handleDeletePermanent}
                  disabled={actionLoading === "delete"}
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-bg-destructive text-text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {actionLoading === "delete" ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  Delete Permanently
                </button>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((item) => {
                const isSelected = selected.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`cursor-pointer group relative rounded-xl overflow-hidden bg-surface-raised border transition-all ${isSelected
                        ? "border-accent-primary ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-app"
                        : "border-border-subtle hover:border-border-strong"
                      }`}
                  >
                    <div className="relative aspect-square bg-bg-muted">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />

                      {/* Selection checkbox */}
                      <div className={`absolute top-2 left-2 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                              ? "bg-accent-primary border-accent-primary"
                              : "bg-black/30 border-white/70 backdrop-blur-sm"
                            }`}
                        >
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Video indicator */}
                      {item.type === "video" && item.durationSeconds && (
                        <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded font-medium backdrop-blur-sm">
                          {formatDuration(item.durationSeconds)}
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="font-medium text-text-primary text-sm truncate">
                        {item.title}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <span>{formatSize(item.sizeBytes)}</span>
                        <span>•</span>
                        <span>Expires {formatDate(item.expiresAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {nextCursor && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-bg-muted text-text-primary rounded-lg font-medium hover:bg-surface-selected transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helpers
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}