import { type Album } from "@/store/albumStore";

type AlbumGridProps = {
  album: Album;
  handleAlbumClick: (albumId: string) => void;
};

export default function AlbumGridItem({ album, handleAlbumClick }: AlbumGridProps) {
  const isShared = album.userRole !== "owner";

  return (
    <div
      onClick={() => handleAlbumClick(album.id)}
      className="group cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md"
    >
      {/* Cover / placeholder */}
      <div className="relative aspect-video rounded-xl bg-bg-muted overflow-hidden">
        {album.coverMediaUrl ? (
          <img
            src={album.coverMediaUrl}
            alt={album.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-primary/20 to-accent-primary/5">
            <span className="text-3xl font-bold text-accent-primary/60 sm:text-4xl">
              {album.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-semibold text-text-primary sm:text-base">
          {album.title}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary sm:text-xs">
          <span>{album.count ?? 0} {(album.count ?? 0) === 1 ? "item" : "items"}</span>
          {isShared && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-accent-primary font-medium">Shared</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}