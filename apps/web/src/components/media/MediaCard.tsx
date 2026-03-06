import type { Media } from "@/store/mediaStore";
import { useLongPress } from "@/hooks/useLongPress";
import { formatDuration } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function MediaCard({
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
  const hasThumbnail = Boolean(item.thumbnailUrl);

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

        const native = e.nativeEvent as MouseEvent & {
          pointerType?: string;
          sourceCapabilities?: { firesTouchEvents?: boolean };
        };
        const isTouchTriggered =
          native.pointerType === "touch" ||
          native.sourceCapabilities?.firesTouchEvents === true;

        // Touch long-press already handled by `useLongPress`; avoid double toggle.
        if (isTouchTriggered) return;

        onSelect();
      }}
      className={`cursor-pointer group relative rounded-xl overflow-hidden transition-all select-none touch-manipulation touch-pan-y ${isSelected ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-app" : ""
        }`}
    >
      <div className="relative aspect-square bg-bg-muted">
        {hasThumbnail ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-muted text-text-secondary pointer-events-none">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-medium">Processing...</span>
          </div>
        )}

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
        {item.type === "video" && hasThumbnail && (
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