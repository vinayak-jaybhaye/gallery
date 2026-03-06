import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  listMedia,
  listMediaSharedWithMe,
  type MediaType,
} from "@/api/media";
import { useMediaStore } from "@/store/mediaStore";
import { useAlbumStore } from "@/store/albumStore";
import type { LayoutContext } from "@/components/layout/AppLayout";
import { MediaCard } from "@/components/media";
import { getErrorMessage, groupMediaByDate, normalizeMediaId } from "@/lib/utils";
import { Loader } from "@/components/ui";

export type MediaScope =
  | { type: "myMedia" }
  | { type: "sharedWithMe" }
  | { type: "album"; albumId: string };

export type MediaGridProps = {
  scope?: MediaScope;
  mediaType?: MediaType;
  viewerBasePath?: string;
  searchQuery?: string;
  selected?: Set<string>;
  setSelected?: (selected: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
};

const DEFAULT_SCOPE = { type: "myMedia" } as const satisfies MediaScope;

function buildQueryKey(scope: MediaScope, mediaType?: MediaType) {
  const base = scope.type === "album" ? `album:${scope.albumId}` : scope.type;
  const typeKey = mediaType ?? "all";
  return `${base}:${typeKey}`;
}

function supportsServerSideTypeFilter(scope: MediaScope) {
  // `listMediaSharedWithMe` currently has no type filter param.
  return scope.type !== "sharedWithMe";
}


export default function MediaGrid({
  scope,
  mediaType,
  viewerBasePath = "/gallery",
  searchQuery: searchQueryProp,
  selected,
  setSelected,
}: MediaGridProps) {
  const navigate = useNavigate();
  const outlet = useOutletContext<LayoutContext | undefined>();
  const searchQuery = searchQueryProp ?? outlet?.searchQuery ?? "";

  const effectiveScope = scope ?? DEFAULT_SCOPE;
  const allowSelection = selected !== undefined;

  const fetchKey = useMemo(() => {
    if (!supportsServerSideTypeFilter(effectiveScope)) {
      return buildQueryKey(effectiveScope, undefined);
    }
    return buildQueryKey(effectiveScope, mediaType);
  }, [effectiveScope, mediaType]);

  const {
    queries,
    getMediaForQuery,
    setMedia,
    appendMedia,
  } = useMediaStore();

  const fetchedItems = getMediaForQuery(fetchKey);
  const nextCursor = queries[fetchKey]?.nextCursor;

  const viewItems = useMemo(() => {
    if (supportsServerSideTypeFilter(effectiveScope) || !mediaType) {
      return fetchedItems;
    }
    return fetchedItems.filter((i) => i.type === mediaType);
  }, [effectiveScope, fetchedItems, mediaType]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectionMode = allowSelection && selected.size > 0;

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  const getAlbumById = useAlbumStore((s) => s.getAlbumById);
  const setAlbumMedia = useAlbumStore((s) => s.setAlbumMedia);
  const appendAlbumMedia = useAlbumStore((s) => s.appendAlbumMedia);
  const album =
    effectiveScope.type === "album" ? getAlbumById(effectiveScope.albumId) : null;

  const fetchPage = useCallback(async (cursor?: string) => {
    if (effectiveScope.type === "sharedWithMe") {
      return await listMediaSharedWithMe(cursor);
    }
    if (effectiveScope.type === "album") {
      return await listMedia(cursor, mediaType, effectiveScope.albumId);
    }
    return await listMedia(cursor, mediaType);
  }, [effectiveScope, mediaType]);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPage(undefined);
      setMedia(fetchKey, data.items, data.nextCursor);
      if (effectiveScope.type === "album") {
        setAlbumMedia(effectiveScope.albumId, data.items, data.nextCursor, mediaType);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load media."));
    } finally {
      setLoading(false);
    }
  }, [effectiveScope, fetchKey, fetchPage, mediaType, setAlbumMedia, setMedia]);

  useEffect(() => {
    if (fetchedItems.length === 0) {
      void loadInitial();
    }
  }, [fetchedItems.length, loadInitial]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchPage(nextCursor);
      appendMedia(fetchKey, data.items, data.nextCursor);
      if (effectiveScope.type === "album") {
        appendAlbumMedia(effectiveScope.albumId, data.items, data.nextCursor, mediaType);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load more media."));
    } finally {
      setLoading(false);
    }
  }, [
    appendAlbumMedia,
    appendMedia,
    effectiveScope,
    fetchKey,
    fetchPage,
    loading,
    mediaType,
    nextCursor,
  ]);

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
    if (!setSelected) return;
    setSelected((prev: Set<string>) => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  }

  function openMedia(id: string) {
    const mediaId = normalizeMediaId(id);
    if (!mediaId) return;

    if (selectionMode) {
      toggleSelect(mediaId);
    } else {
      navigate(`${viewerBasePath}/${mediaId}`);
    }
  }

  // Group media by date
  const groupedMedia = useMemo(() => groupMediaByDate(viewItems), [viewItems]);

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
    <div className="w-full bg-bg-app">
      {error && (
        <div className="mb-4 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
          {error}
        </div>
      )}
      {/* Empty State */}
      {!loading && fetchedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-bg-muted flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium mb-1">
            {effectiveScope.type === "sharedWithMe"
              ? "No media shared with you"
              : effectiveScope.type === "album"
                ? `No media in ${album?.title ?? "this album"}`
                : "No media yet"}
          </p>
          <p className="text-text-muted text-sm">
            {effectiveScope.type === "sharedWithMe"
              ? "When someone shares media with you, it will show up here"
              : effectiveScope.type === "album"
                ? "Add photos and videos to see them here"
                : "Upload photos and videos to get started"}
          </p>
        </div>
      )}

      {/* No Search Results */}
      {!loading && viewItems.length > 0 && filteredGroupedMedia.length === 0 && searchQuery.trim() && (
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
                <MediaCard
                  key={item.id}
                  item={item}
                  isSelected={!!(selected && selected.has(item.id))}
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
      {loading && viewItems.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Loader size="sm" label="Loading more..." />
        </div>
      )}
    </div>
  );
}