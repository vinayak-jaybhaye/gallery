import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listDeletedMedia,
  recoverMedia,
  deleteFromTrash,
  emptyTrash,
  type TrashItem,
} from "@/api/media";
import type { LayoutContext } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui";
import { getErrorMessage } from "@/lib/utils";

export default function TrashPage() {
  const outlet = useOutletContext<LayoutContext | undefined>();
  const searchQuery = outlet?.searchQuery ?? "";
  const [items, setItems] = useState<TrashItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightCursorRef = useRef<string | null>(null);
  const loadedCursorsRef = useRef<Set<string>>(new Set());
  const lastTriggerScrollYRef = useRef<number>(-1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchKey = searchQuery.trim().toLowerCase();

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    setSelected(new Set());
  }, [searchKey]);

  async function loadInitial() {
    try {
      setError(null);
      inFlightCursorRef.current = null;
      loadedCursorsRef.current.clear();
      lastTriggerScrollYRef.current = -1;
      const data = await listDeletedMedia();
      setItems(getUniqueTrashItems(data.items));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load trash items."));
    }
  }

  const loadMore = useCallback(async () => {
    const cursor = nextCursor;
    if (!cursor || inFlightCursorRef.current || loadedCursorsRef.current.has(cursor)) return;

    inFlightCursorRef.current = cursor;
    setLoadingMore(true);

    try {
      setError(null);
      const data = await listDeletedMedia(cursor);
      setItems((prev) => getUniqueTrashItems([...prev, ...data.items]));
      loadedCursorsRef.current.add(cursor);
      const resolvedNextCursor =
        data.nextCursor && data.nextCursor !== cursor ? data.nextCursor : undefined;
      setNextCursor(resolvedNextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load more trash items."));
      setNextCursor(undefined);
    } finally {
      inFlightCursorRef.current = null;
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          nextCursor &&
          !inFlightCursorRef.current &&
          !loadedCursorsRef.current.has(nextCursor)
        ) {
          const scrollY =
            window.scrollY ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0;
          if (
            lastTriggerScrollYRef.current !== -1 &&
            Math.abs(scrollY - lastTriggerScrollYRef.current) < 48
          ) {
            return;
          }
          lastTriggerScrollYRef.current = scrollY;
          void loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadMore]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  }

  async function handleRecover() {
    if (!selected.size) return;
    setActionLoading("recover");

    const ids = Array.from(selected);
    try {
      setError(null);
      await recoverMedia(ids);
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to recover selected media."));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeletePermanent() {
    if (!selected.size) {
      setShowDeleteConfirm(false);
      return;
    }
    setActionLoading("delete");

    const ids = Array.from(selected);
    try {
      setError(null);
      await deleteFromTrash(ids);
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      setSelected(new Set());
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete selected media permanently."));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEmptyTrash() {
    setActionLoading("empty");

    try {
      setError(null);
      await emptyTrash();
      setItems([]);
      setSelected(new Set());
      setNextCursor(undefined);
      inFlightCursorRef.current = null;
      loadedCursorsRef.current.clear();
      lastTriggerScrollYRef.current = -1;
      setShowEmptyConfirm(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to empty trash."));
    } finally {
      setActionLoading(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (!searchKey) return items;

    return items.filter((item) => {
      const title = item.title.toLowerCase();
      const type = item.type.toLowerCase();
      return title.includes(searchKey) || type.includes(searchKey);
    });
  }, [items, searchKey]);

  return (
    <div className="w-full p-4 sm:p-6 bg-bg-app">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="mb-4 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
            {error}
          </div>
        )}
        <div className="sticky top-16 z-20 mb-6 bg-bg-app pb-4 pt-2 sm:mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">Trash</h1>
              <p className="text-text-secondary text-sm mt-1">
                Items in trash will be permanently deleted after 30 days
              </p>
              {searchKey && (
                <p className="text-xs text-text-muted mt-2">
                  Searching trash for: <span className="font-medium text-text-primary">{searchQuery.trim()}</span>
                </p>
              )}
            </div>

            {items.length > 0 && (
              <button
                onClick={() => setShowEmptyConfirm(true)}
                disabled={actionLoading === "empty"}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-bg-muted text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors disabled:opacity-50 w-full sm:w-auto"
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

          {selected.size > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-raised p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
              <span className="text-text-primary font-medium">{selected.size} selected</span>

              <div className="hidden flex-1 sm:block" />

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  onClick={handleRecover}
                  disabled={actionLoading === "recover"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
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
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={actionLoading === "delete"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-bg-destructive px-4 py-2 text-sm font-medium text-text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
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
            </div>
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

        {items.length > 0 && filteredItems.length === 0 && searchKey && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-secondary font-medium mb-1">No trash items match your search</p>
            <p className="text-text-muted text-sm">Try a different term</p>
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredItems.map((item) => {
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

            {/* Infinite scroll sentinel */}
            {nextCursor && <div ref={sentinelRef} className="h-1" />}

            {loadingMore && (
              <div className="mt-10 flex justify-center">
                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-bg-muted text-text-primary rounded-lg font-medium">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        tone="destructive"
        title={`Delete ${selected.size} selected ${selected.size === 1 ? "item" : "items"} permanently?`}
        description="This action cannot be undone."
        confirmLabel="Yes, delete"
        noLabel="No"
        cancelLabel="Cancel"
        busy={actionLoading === "delete"}
        onConfirm={() => void handleDeletePermanent()}
        onNo={() => setShowDeleteConfirm(false)}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showEmptyConfirm}
        tone="destructive"
        title="Empty trash permanently?"
        description="All items in trash will be permanently deleted and cannot be recovered."
        confirmLabel="Yes, empty trash"
        noLabel="No"
        cancelLabel="Cancel"
        busy={actionLoading === "empty"}
        onConfirm={() => void handleEmptyTrash()}
        onNo={() => setShowEmptyConfirm(false)}
        onCancel={() => setShowEmptyConfirm(false)}
      />
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

function getUniqueTrashItems(items: TrashItem[]) {
  const map = new Map<string, TrashItem>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}