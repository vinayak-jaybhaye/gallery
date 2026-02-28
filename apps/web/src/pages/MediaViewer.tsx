import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMedia } from "@/api/media";
import { useMediaStore } from "@/store/mediaStore";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

export default function MediaViewer() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();

  const {
    items,
    getMediaById,
    enrichMedia,
  } = useMediaStore();

  const [loading, setLoading] = useState(false);

  const media = mediaId ? getMediaById(mediaId) : null;

  // Fetch detail only if not enriched
  useEffect(() => {
    if (!mediaId) return;

    const existing = getMediaById(mediaId);

    if (existing?.originalUrl) return;

    async function fetchDetail() {
      try {
        setLoading(true);
        const detail = await getMedia(mediaId);
        console.log("Detail fetched:", detail);
        enrichMedia(detail);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [mediaId]);

  function closeModal() {
    navigate("/gallery");
  }

  // Prev / Next logic
  const currentIndex = mediaId
    ? items.findIndex((m) => m.id === mediaId)
    : -1;

  const prev =
    currentIndex > 0 ? items[currentIndex - 1] : null;

  const next =
    currentIndex !== -1 &&
      currentIndex < items.length - 1
      ? items[currentIndex + 1]
      : null;

  function goPrev() {
    if (prev) navigate(`/gallery/${prev.id}`);
  }

  function goNext() {
    if (next) navigate(`/gallery/${next.id}`);
  }

  // Arrow key navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closeModal();
    }

    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-h-[85vh] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT CLICK ZONE */}
        {prev && (
          <button
            onClick={goPrev}
            className="absolute left-0 top-0 h-full w-1/4 flex items-center justify-start pl-6 group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <ArrowLeft className="w-8 h-8 text-white" />
            </div>
          </button>
        )}

        {/* MEDIA */}
        <div className="relative z-10 max-h-[85vh] flex flex-col items-center text-white">
          {loading && (
            <div className="text-white text-center">Loading...</div>
          )}

          {media && (
            <>
              {media.type === "image" ? (
                <img
                  src={media.originalUrl}
                  alt={media.title}
                  className="max-h-[75vh] rounded-lg object-contain"
                />
              ) : (
                <video
                  src={media.originalUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] rounded-lg"
                />
              )}

              <div className="mt-4 text-center">
                <h2 className="text-lg font-semibold">
                  {media.title}
                </h2>
              </div>
            </>
          )}
        </div>

        {/* RIGHT CLICK ZONE */}
        {next && (
          <button
            onClick={goNext}
            className="absolute right-0 top-0 h-full w-1/4 flex items-center justify-end pr-6 group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <ArrowRight className="w-8 h-8 text-white" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}