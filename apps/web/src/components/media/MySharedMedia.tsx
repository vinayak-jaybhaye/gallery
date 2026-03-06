import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listMediaSharedByMe, type SharedMediaItem } from "@/api/media";
import { getErrorMessage, normalizeMediaId } from "@/lib/utils";
import { Users } from "lucide-react";
import { Loader } from "@/components/ui";

type MySharedMediaProps = {
  searchQuery?: string;
};

export default function MySharedMedia({ searchQuery = "" }: MySharedMediaProps) {
  const navigate = useNavigate();

  const [items, setItems] = useState<SharedMediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchKey = searchQuery.trim().toLowerCase();

  /* ---------------- Initial Load ---------------- */

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      setError(null);
      const data = await listMediaSharedByMe();
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load shared media."));
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Pagination ---------------- */

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;

    try {
      setLoading(true);
      setError(null);
      const data = await listMediaSharedByMe(nextCursor);
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load more shared media."));
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

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

  /* ---------------- Render ---------------- */

  const filteredItems = useMemo(() => {
    if (!searchKey) return items;
    return items.filter((item) => item.title.toLowerCase().includes(searchKey));
  }, [items, searchKey]);

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
            {error}
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="text-text-muted text-sm">
            You haven't shared any media yet.
          </div>
        )}

        {!loading && items.length > 0 && filteredItems.length === 0 && searchKey && (
          <div className="text-text-muted text-sm">
            No shared media match your search.
          </div>
        )}

        <div>
          {filteredItems.map((item) => (
            <div
              key={item.id ?? item.mediaId ?? `${item.createdAt}-${item.title}`}
              onClick={() => {
                const mediaId = normalizeMediaId(item.id ?? item.mediaId);
                if (!mediaId) return;
                navigate(`/gallery/${mediaId}`);
              }}
              className="cursor-pointer flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0 sm:gap-4 hover:bg-bg-muted/50 transition-colors"
            >
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Share count */}
              <div className="flex items-center gap-1.5 shrink-0 text-xs text-text-muted">
                <Users size={14} />
                <span>
                  {item.shareCount} {item.shareCount === 1 ? "person" : "people"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {loading && (
          <div className="flex justify-center">
            <Loader size="sm" label="Loading..." />
          </div>
        )}
      </div>
    </div>
  );
}