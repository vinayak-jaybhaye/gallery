import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  listMyPublicLinks,
  revokePublicShare,
  type PublicLink,
} from "@/api/media";
import { getErrorMessage, normalizeMediaId } from "@/lib/utils";
import { Loader } from "@/components/ui";
import PublicLinkItem from "./PublicLinkItem";
import { useNavigate } from "react-router-dom";

type PublicLinksProps = {
  searchQuery?: string;
};

export default function PublicLinks({ searchQuery = "" }: PublicLinksProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicLink[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchKey = searchQuery.trim().toLowerCase();

  /* ---------------- Load Initial ---------------- */

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      setError(null);
      const data = await listMyPublicLinks();
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load public links."));
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
      const data = await listMyPublicLinks(nextCursor);
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load more public links."));
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

  /* ---------------- Actions ---------------- */

  async function handleRevoke(shareId: string) {
    try {
      setError(null);
      await revokePublicShare([shareId]);
      setItems((prev) =>
        prev.filter((item) => item.shareId !== shareId)
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to revoke public link."));
    }
  }

  async function handleCopy(link: PublicLink) {
    try {
      setError(null);
      const url = `${window.location.origin}/public/${link.token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(link.shareId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Failed to copy link. Please copy it manually.");
    }
  }

  /* ---------------- Helpers ---------------- */

  function isExpired(link: PublicLink) {
    if (!link.expiresAt) return false;
    return new Date(link.expiresAt) < new Date();
  }

  /* ---------------- Render ---------------- */

  const filteredItems = useMemo(() => {
    if (!searchKey) return items;

    return items.filter((link) => {
      const title = (link.title ?? "").toLowerCase();
      const fullUrl = `${window.location.origin}/public/${link.token}`.toLowerCase();
      return title.includes(searchKey) || fullUrl.includes(searchKey);
    });
  }, [items, searchKey]);

  const onItemClick = (mediaId: string | undefined) => {
    const normalizedMediaId = normalizeMediaId(mediaId);
    if (!normalizedMediaId) return;
    navigate(`/gallery/${normalizedMediaId}`);
  }

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
            No public links created yet.
          </div>
        )}

        {!loading && items.length > 0 && filteredItems.length === 0 && searchKey && (
          <div className="text-text-muted text-sm">
            No public links match your search.
          </div>
        )}

        <div className="space-y-4">
          {filteredItems.map((link) => {
            const expired = isExpired(link);
            const fullUrl = `${window.location.origin}/public/${link.token}`;
            const mediaId = normalizeMediaId(link.mediaId);

            return (
              <PublicLinkItem
                key={link.shareId}
                link={link}
                handleCopy={handleCopy}
                handleRevoke={handleRevoke}
                copiedId={copiedId}
                expired={expired}
                fullUrl={fullUrl}
                onItemClick={() => onItemClick(mediaId)}
              />
            );
          })}
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