import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listAlbums } from "@/api/albums";
import { useAlbumStore } from "@/store/albumStore";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getErrorMessage } from "@/lib/utils";
import type { LayoutContext } from "@/components/layout/AppLayout";
import AlbumGridItem from "./AlbumGridItem";
import { Loader } from "@/components/ui";

type AlbumGridProps = {
  refreshKey?: number;
  searchQuery?: string;
};

export default function AlbumGrid({ refreshKey, searchQuery: searchQueryProp }: AlbumGridProps) {
  const {
    entities,
    queries,
    setAlbums,
    appendAlbums,
    setSearchResults,
    appendSearchResults,
  } = useAlbumStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const outlet = useOutletContext<LayoutContext | undefined>();
  const searchQuery = searchQueryProp ?? outlet?.searchQuery ?? "";
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const lastRequestedCursorRef = useRef<string | null>(null);

  const searchKey = searchQuery.trim();

  const queryState = useMemo(() => {
    if (searchKey) return queries.search[searchKey] ?? { ids: [], hasMore: false };
    return queries.all;
  }, [queries.all, queries.search, searchKey]);

  const albums = useMemo(() => {
    return queryState.ids.map((id) => entities[id]).filter(Boolean);
  }, [entities, queryState.ids]);

  const filteredAlbums = useMemo(() => {
    if (!searchKey) return albums;
    const query = searchKey.toLowerCase();
    return albums.filter((album) => album.title.toLowerCase().includes(query));
  }, [albums, searchKey]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await listAlbums({ search: searchKey || undefined });
      if (searchKey) setSearchResults(searchKey, data.items, data.nextCursor);
      else setAlbums(data.items, data.nextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load albums."));
    } finally {
      setLoading(false);
    }
  }, [searchKey, setAlbums, setSearchResults]);

  const loadMore = useCallback(async () => {
    const cursor = queryState.nextCursor ?? null;
    if (!queryState.hasMore || !cursor || loading || loadingMoreRef.current) return;
    if (lastRequestedCursorRef.current === cursor) return;

    loadingMoreRef.current = true;
    lastRequestedCursorRef.current = cursor;
    setLoading(true);
    try {
      setError(null);
      const data = await listAlbums({
        cursor,
        search: searchKey || undefined,
      });

      if (searchKey) appendSearchResults(searchKey, data.items, data.nextCursor);
      else appendAlbums(data.items, data.nextCursor);
    } catch (err) {
      // Allow retry for the same cursor when a request fails.
      lastRequestedCursorRef.current = null;
      setError(getErrorMessage(err, "Failed to load more albums."));
    } finally {
      loadingMoreRef.current = false;
      setLoading(false);
    }
  }, [
    appendAlbums,
    appendSearchResults,
    loading,
    queryState.hasMore,
    queryState.nextCursor,
    searchKey,
  ]);

  // Reset pagination guards when scope changes.
  useEffect(() => {
    loadingMoreRef.current = false;
    lastRequestedCursorRef.current = null;
  }, [searchKey, refreshKey]);

  // Forced reload (refresh / search key change when refresh mode is enabled).
  useEffect(() => {
    if (refreshKey === undefined) return;
    void loadInitial();
  }, [loadInitial, refreshKey]);

  // Cached load for non-refresh mode.
  useEffect(() => {
    if (refreshKey !== undefined) return;
    if (queryState.ids.length === 0) {
      void loadInitial();
    }
  }, [loadInitial, queryState.ids.length, refreshKey]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && queryState.hasMore && !loading) {
        void loadMore();
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loading, queryState.hasMore]);

  function handleAlbumClick(id: string) {
    navigate(`/albums/${id}`);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {error && (
        <div className="col-span-full rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
          {error}
        </div>
      )}
      {filteredAlbums.map((album) => {
        return (
          <AlbumGridItem key={album.id} album={album} handleAlbumClick={handleAlbumClick} />
        );
      })}
      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="col-span-full h-px" />
      {loading && (
        <div className="col-span-full flex justify-center">
          <Loader size="sm" label="Loading..." />
        </div>
      )}
      {!loading && filteredAlbums.length === 0 && (
        <div className="col-span-full text-center text-text-secondary">
          {searchKey ? "No albums match your search." : "No albums yet."}
        </div>
      )}
    </div>
  );
}