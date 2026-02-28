import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listMedia, deleteMedia } from "@/api/media";
import Upload from "@/components/uploads/Upload";
import { useMediaStore } from "@/store/mediaStore";

export default function MediaGrid() {
  const navigate = useNavigate();

  const { items, nextCursor, setMedia, appendMedia } = useMediaStore();

  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectionMode = selected.size > 0;

  useEffect(() => {
    if (items.length === 0) {
      loadInitial();
    }
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      const data = await listMedia();
      setMedia(data.items, data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loading) return;

    try {
      setLoading(true);
      const data = await listMedia(nextCursor);
      appendMedia(data.items, data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

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
    setMedia(
      items.filter((item) => !selected.has(item.id)),
      nextCursor
    );

    setSelected(new Set());
  }

  function cancelSelection() {
    setSelected(new Set());
  }

  return (
    <div className="min-h-screen w-full p-6 bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <Upload />
      </div>
      {/* navigate to /uploads */}
      <div>
        <button
          onClick={() => navigate("/uploads")}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          View Uploads
        </button>
      </div>

      {/* Selection Action Bar */}
      {selectionMode && (
        <div className="mb-4 flex items-center gap-4 bg-white p-3 rounded shadow">
          <span>{selected.size} selected</span>

          <button
            onClick={handleMoveToTrash}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Move to Trash
          </button>

          <button
            onClick={cancelSelection}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => {
          const isSelected = selected.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => openMedia(item.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleSelect(item.id);
              }}
              className={`cursor-pointer group ${
                isSelected ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="relative overflow-hidden rounded-lg bg-gray-200">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Checkbox overlay */}
                <div className="absolute top-2 left-2">
                  <div
                    className={`w-5 h-5 rounded border ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-300"
                    }`}
                  />
                </div>

                {item.type === "video" && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 rounded-full p-3">
                        <svg
                          viewBox="0 0 24 24"
                          fill="white"
                          className="w-6 h-6"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {item.durationSeconds && (
                      <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white px-1 rounded">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    )}
                  </>
                )}
              </div>

              <p className="mt-2 text-sm truncate">
                {item.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {nextCursor && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
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