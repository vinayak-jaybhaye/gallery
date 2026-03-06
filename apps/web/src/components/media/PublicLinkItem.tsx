import { Copy, Check, Trash2 } from "lucide-react";
import type { PublicLink } from "@/api/media";

type PublicLinkItemProps = {
  link: PublicLink;
  handleCopy: (link: PublicLink) => void;
  handleRevoke: (shareId: string) => void;
  onItemClick: () => void;
  copiedId: string | null;
  expired: boolean;
  fullUrl: string;
};

export default function PublicLinkItem({ link, handleCopy, handleRevoke, onItemClick, copiedId, expired, fullUrl }: PublicLinkItemProps) {
  const isCopied = copiedId === link.shareId;

  return (
    <div
      className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0 sm:gap-4"
      onClick={onItemClick}
    >
      {/* Thumbnail */}
      {link.thumbnailUrl && (
        <img
          src={link.thumbnailUrl}
          alt={link.title}
          className="h-12 w-12 shrink-0 rounded-lg object-cover sm:h-14 sm:w-14"
        />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {link.title}
        </p>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 block truncate text-xs text-blue-500 hover:underline"
        >
          {fullUrl}
        </a>
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          <span className={expired ? "text-red-500" : "text-emerald-500"}>
            {expired ? "Expired" : "Active"}
          </span>
          {link.expiresAt && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">
                Expires {new Date(link.expiresAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleCopy(link)}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${isCopied
            ? "text-emerald-600"
            : "text-text-secondary hover:bg-bg-muted"
            }`}
        >
          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isCopied ? "Copied" : "Copy"}</span>
        </button>

        <button
          onClick={() => handleRevoke(link.shareId)}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-destructive hover:text-text-destructive-foreground"
          title="Revoke link"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}