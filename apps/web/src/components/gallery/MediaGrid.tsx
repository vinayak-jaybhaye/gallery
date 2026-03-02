import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { listMedia, deleteMedia, type MediaType } from "@/api/media";
import { useMediaStore, type Media } from "@/store/mediaStore";
import { useLongPress } from "@/hooks/useLongPress";
import type { LayoutContext } from "@/components/layout/AppLayout";

type QueryKey = "all" | "images" | "videos";

type GroupedMedia = {
  date: string;
  label: string;
  items: Media[];
};

type MediaGridProps = {
  mediaType?: MediaType;
};

// Map MediaType to QueryKey
function getQueryKey(mediaType?: MediaType): QueryKey {
  if (mediaType === "image") return "images";
  if (mediaType === "video") return "videos";
  return "all";
}

function groupMediaByDate(items: Media[]): GroupedMedia[] {
  const groups = new Map<string, Media[]>();

  for (const item of items) {
    const date = new Date(item.createdAt);
    // Use local date components to avoid timezone issues
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  }

  // Sort groups by date descending (newest first)
  const sortedEntries = Array.from(groups.entries()).sort(
    ([a], [b]) => b.localeCompare(a)
  );

  return sortedEntries.map(([dateKey, items]) => ({
    date: dateKey,
    label: formatDateLabel(dateKey),
    items,
  }));
}

function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (targetDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // Check if same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function MediaGrid({ mediaType }: MediaGridProps) {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext<LayoutContext>();

  const queryKey = getQueryKey(mediaType);
  const { queries, getMediaForQuery, setMedia, appendMedia, deleteMedia: deleteMediaFromStore } = useMediaStore();

  const items = getMediaForQuery(queryKey);
  const nextCursor = queries[queryKey].nextCursor;

  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectionMode = selected.size > 0;

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) {
      loadInitial();
    }
  }, [queryKey]);

  async function loadInitial() {
    try {
      setLoading(true);
      const data = await listMedia(undefined, mediaType);
      setMedia(queryKey, data.items, data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;

    try {
      setLoading(true);
      const data = await listMedia(nextCursor, mediaType);
      appendMedia(queryKey, data.items, data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, appendMedia, queryKey, mediaType]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [nextCursor, loading, loadMore]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  }

  function openMedia(id: string) {
    if (selectionMode) {
      toggleSelect(id);
    } else {
      navigate(`/gallery/${id}`);
    }
  }

  async function handleMoveToTrash() {
    if (!selected.size) return;

    const ids = Array.from(selected);
    await deleteMedia(ids);

    // remove from UI immediately
    ids.forEach((id) => deleteMediaFromStore(id));

    setSelected(new Set());
  }

  function cancelSelection() {
    setSelected(new Set());
  }

  // Group media by date
  const groupedMedia = useMemo(() => groupMediaByDate(items), [items]);

  // Filter media based on search query
  const filteredGroupedMedia = useMemo(() => {
    if (!searchQuery.trim()) return groupedMedia;

    const query = searchQuery.toLowerCase();
    return groupedMedia
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedMedia, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-bg-app">
      {/* Selection Action Bar */}
      {selectionMode && (
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-surface-raised border border-border-subtle p-4 rounded-xl shadow-sm">
          <span className="text-text-primary font-medium">{selected.size} selected</span>

          <div className="hidden sm:block flex-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleMoveToTrash}
              className="cursor-pointer flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-bg-destructive text-text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Move to</span> Trash
            </button>

            <button
              onClick={cancelSelection}
              className="cursor-pointer flex-1 sm:flex-none px-4 py-2 bg-bg-muted text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-bg-muted flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium mb-1">No media yet</p>
          <p className="text-text-muted text-sm">Upload photos and videos to get started</p>
        </div>
      )}

      {/* No Search Results */}
      {!loading && items.length > 0 && filteredGroupedMedia.length === 0 && searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-bg-muted flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium mb-1">No results found</p>
          <p className="text-text-muted text-sm">Try a different search term</p>
        </div>
      )}

      {/* Grid grouped by date */}
      <div className="space-y-8">
        {filteredGroupedMedia.map((group) => (
          <section key={group.date}>
            {/* Date Header */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-text-primary font-semibold text-base sm:text-lg whitespace-nowrap">
                {group.label}
              </h2>
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-text-muted text-sm whitespace-nowrap">
                {group.items.length} {group.items.length === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
              {group.items.map((item) => (
                <MediaItem
                  key={item.id}
                  item={item}
                  isSelected={selected.has(item.id)}
                  selectionMode={selectionMode}
                  onSelect={() => toggleSelect(item.id)}
                  onOpen={() => openMedia(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading indicator */}
      {loading && items.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 text-text-secondary">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Separate component to properly use the useLongPress hook per item
function MediaItem({
  item,
  isSelected,
  selectionMode,
  onSelect,
  onOpen,
}: {
  item: Media;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const longPressHandlers = useLongPress({
    onLongPress: onSelect,
    onClick: selectionMode ? onSelect : onOpen,
    delay: 500,
  });

  return (
    <div
      {...longPressHandlers}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={`cursor-pointer group relative rounded-xl overflow-hidden transition-all select-none ${isSelected ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-app" : ""
        }`}
    >
      <div className="relative aspect-square bg-bg-muted">
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
          draggable={false}
        />

        {/* Selection checkbox */}
        <div
          className={`absolute top-2 left-2 transition-opacity ${selectionMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
              ? "bg-accent-primary border-accent-primary"
              : "bg-black/30 border-white/70 backdrop-blur-sm"
              }`}
          >
            {isSelected && (
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Video overlay */}
        {item.type === "video" && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {item.durationSeconds && (
              <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded font-medium backdrop-blur-sm pointer-events-none">
                {formatDuration(item.durationSeconds)}
              </span>
            )}
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-white text-sm font-medium truncate">{item.title}</p>
      </div>
    </div>
  );
}