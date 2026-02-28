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

    const ids = Array.from(selected);
    await recoverMedia(ids);

    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
  }

  async function handleDeletePermanent() {
    if (!selected.size) return;

    const ids = Array.from(selected);
    await deleteFromTrash(ids);

    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
  }

  async function handleEmptyTrash() {
    await emptyTrash();
    setItems([]);
    setSelected(new Set());
    setNextCursor(undefined);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Trash</h1>

      {items.length === 0 && (
        <div className="text-gray-500">Trash is empty</div>
      )}

      {items.length > 0 && (
        <>
          {/* Action Bar */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleRecover}
              disabled={!selected.size}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Recover
            </button>

            <button
              onClick={handleDeletePermanent}
              disabled={!selected.size}
              className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Delete Permanently
            </button>

            <button
              onClick={handleEmptyTrash}
              className="bg-gray-700 text-white px-4 py-2 rounded"
            >
              Empty Trash
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item) => {
              const isSelected = selected.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`border rounded-lg overflow-hidden cursor-pointer ${isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-40 object-cover"
                  />

                  <div className="p-3 text-sm">
                    <div className="font-medium truncate">
                      {item.title}
                    </div>

                    <div className="text-gray-500 text-xs mt-1">
                      {formatSize(item.sizeBytes)}
                    </div>

                    {item.type === "video" && item.durationSeconds && (
                      <div className="text-gray-500 text-xs">
                        {formatDuration(item.durationSeconds)}
                      </div>
                    )}

                    <div className="text-gray-400 text-xs mt-1">
                      Expires {formatDate(item.expiresAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {nextCursor && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 border rounded"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helpers
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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