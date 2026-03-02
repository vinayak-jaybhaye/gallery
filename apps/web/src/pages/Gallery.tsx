import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MediaGrid from "@/components/gallery/MediaGrid";
import { Image, PlayCircle, LayoutGrid } from "lucide-react";
import type { MediaType } from "@/api/media";

type TabKey = MediaType | "all";

const tabs: { key: TabKey; label: string; icon: typeof Image; path: string }[] = [
  { key: "all", label: "All", icon: LayoutGrid, path: "/gallery" },
  { key: "image", label: "Images", icon: Image, path: "/images" },
  { key: "video", label: "Videos", icon: PlayCircle, path: "/videos" },
];

// Map path to media type
function getMediaTypeFromPath(pathname: string): MediaType | undefined {
  if (pathname.startsWith("/images")) return "image";
  if (pathname.startsWith("/videos")) return "video";
  return undefined; // "all" for /gallery
}

// Map path to active tab key
function getActiveTabFromPath(pathname: string): TabKey {
  if (pathname.startsWith("/images")) return "image";
  if (pathname.startsWith("/videos")) return "video";
  return "all";
}

export default function Gallery() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = getActiveTabFromPath(location.pathname);
  const mediaType = getMediaTypeFromPath(location.pathname);

  return (
    <>
      <div className="p-4 sm:p-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {tabs.map(({ key, label, icon: Icon, path }) => (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === key
                  ? "bg-accent-soft text-accent-primary"
                  : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        <MediaGrid mediaType={mediaType} />
      </div>
      <Outlet />
    </>
  );
}