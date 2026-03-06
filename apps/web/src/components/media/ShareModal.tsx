import { Share, X, Trash2, Loader2, Send } from "lucide-react";
import {
  shareMedia,
  listMediaShares,
  type MediaShare,
  removeMediaShare,
  createPublicShare,
  getPublicLinksByMediaId,
  revokePublicShare,
  type PublicLink,
} from "@/api/media";
import { ConfirmDialog } from "@/components/ui";
import { getErrorMessage, normalizeMediaId } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";

export type ShareModalProps = {
  mediaId: string;
  onClose: () => void;
};

export default function ShareModal({
  mediaId,
  onClose,
}: ShareModalProps) {
  const MAX_EXPIRY_SECONDS = 31_536_000;
  const presetExpiryOptions = [
    { value: "1h", label: "1 hour", seconds: 60 * 60 },
    { value: "24h", label: "24 hours", seconds: 24 * 60 * 60 },
    { value: "7d", label: "7 days", seconds: 7 * 24 * 60 * 60 },
    { value: "30d", label: "30 days", seconds: 30 * 24 * 60 * 60 },
    { value: "never", label: "Never", seconds: null },
  ] as const;

  const [email, setEmail] = useState("");
  const [shares, setShares] = useState<MediaShare[]>([]);
  const [publicLinks, setPublicLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingShareUserId, setRemovingShareUserId] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [revokingAllPublicLinks, setRevokingAllPublicLinks] = useState(false);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExpirySelector, setShowExpirySelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiryMode, setExpiryMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<(typeof presetExpiryOptions)[number]["value"]>("7d");
  const [customDays, setCustomDays] = useState("7");
  const [customHours, setCustomHours] = useState("0");
  const [customMinutes, setCustomMinutes] = useState("0");
  const normalizedMediaId = useMemo(() => normalizeMediaId(mediaId), [mediaId]);

  const customExpirySeconds = useMemo(() => {
    const dayValue = Number(customDays || "0");
    const hourValue = Number(customHours || "0");
    const minuteValue = Number(customMinutes || "0");

    const isValid =
      Number.isInteger(dayValue) && dayValue >= 0 &&
      Number.isInteger(hourValue) && hourValue >= 0 &&
      Number.isInteger(minuteValue) && minuteValue >= 0;

    if (!isValid) {
      return null;
    }

    const totalSeconds = (dayValue * 24 * 60 * 60) + (hourValue * 60 * 60) + (minuteValue * 60);

    if (totalSeconds <= 0) {
      return null;
    }

    return totalSeconds;
  }, [customDays, customHours, customMinutes]);

  const customExpiryError = useMemo(() => {
    if (expiryMode !== "custom") return null;
    if (customExpirySeconds === null) return "Enter a valid duration in day/hr/min.";
    if (customExpirySeconds > MAX_EXPIRY_SECONDS) return "Maximum expiry is 365 days.";
    return null;
  }, [customExpirySeconds, expiryMode, MAX_EXPIRY_SECONDS]);

  const expirySummary = (() => {
    const selectedPresetOption = presetExpiryOptions.find((option) => option.value === selectedPreset);

    if (expiryMode === "preset") {
      if (!selectedPresetOption || selectedPresetOption.seconds === null) {
        return "Link does not expire.";
      }
      return `Expires in ${selectedPresetOption.label}.`;
    }

    if (!customExpirySeconds) {
      return "Set a valid custom duration.";
    }

    const days = Math.floor(customExpirySeconds / (24 * 60 * 60));
    const hours = Math.floor((customExpirySeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((customExpirySeconds % (60 * 60)) / 60);
    const parts = [
      days > 0 ? `${days}d` : null,
      hours > 0 ? `${hours}h` : null,
      minutes > 0 ? `${minutes}m` : null,
    ].filter(Boolean);

    return parts.length > 0 ? `Expires in ${parts.join(" ")}.` : "Set a valid custom duration.";
  })();

  /* ---------------- Load Data ---------------- */

  useEffect(() => {
    if (!normalizedMediaId) {
      setShares([]);
      setPublicLinks([]);
      setError("Invalid media link.");
      return;
    }

    const mediaId = normalizedMediaId;

    async function load() {
      try {
        setError(null);
        const [mediaShares, links] = await Promise.all([
          listMediaShares(mediaId),
          getPublicLinksByMediaId(mediaId),
        ]);
        setShares(mediaShares);
        setPublicLinks(links);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load sharing details."));
      }
    }

    void load();
  }, [normalizedMediaId]);

  /* ---------------- Email Share ---------------- */

  async function handleShare() {
    if (!email.trim() || !normalizedMediaId) return;

    try {
      setLoading(true);
      setError(null);
      await shareMedia(normalizedMediaId, email.trim());
      const updated = await listMediaShares(normalizedMediaId);
      setShares(updated);
      setEmail("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to share media."));
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Public Link Logic ---------------- */

  async function handleCreatePublicLink() {
    if (!normalizedMediaId) return;

    const preset = presetExpiryOptions.find((option) => option.value === selectedPreset);
    const presetSeconds = preset?.seconds ?? null;
    const expiresInSeconds = expiryMode === "preset"
      ? (presetSeconds ?? undefined)
      : (customExpirySeconds ?? undefined);

    if (expiryMode === "custom" && customExpiryError) return;

    try {
      setCreatingLink(true);
      setError(null);

      await createPublicShare(
        normalizedMediaId,
        expiresInSeconds
      );

      const updated = await getPublicLinksByMediaId(normalizedMediaId);
      setPublicLinks(updated);
      setShowExpirySelector(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create public link."));
    } finally {
      setCreatingLink(false);
    }
  }

  async function handleCopyPublicLink(token: string, id: string) {
    try {
      setError(null);
      const link = `${window.location.origin}/public/${token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Failed to copy link. Please copy it manually.");
    }
  }

  async function handleRevokePublicLink(shareId: string) {
    try {
      setError(null);
      await revokePublicShare([shareId]);
      setPublicLinks((prev) =>
        prev.filter((link) => link.shareId !== shareId)
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to revoke public link."));
    }
  }

  async function handleRemoveShare(userId: string) {
    if (!normalizedMediaId) return;

    try {
      setRemovingShareUserId(userId);
      setError(null);
      await removeMediaShare(normalizedMediaId, userId);
      setShares((prev) => prev.filter((share) => share.userId !== userId));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove shared access."));
    } finally {
      setRemovingShareUserId(null);
    }
  }

  async function handleRevokeAllPublicLinks() {
    if (publicLinks.length === 0) return;

    try {
      setRevokingAllPublicLinks(true);
      setError(null);
      const shareIds = publicLinks.map((link) => link.shareId);
      await revokePublicShare(shareIds);
      setPublicLinks([]);
      setShowRevokeAllConfirm(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to revoke all public links."));
    } finally {
      setRevokingAllPublicLinks(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-raised text-text-primary shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface-raised px-5 py-4">
          <div className="flex items-center gap-2">
            <Share size={18} />
            <h2 className="text-lg font-semibold">Share</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex max-h-[calc(90vh-64px)] flex-col gap-4 overflow-hidden p-4 sm:p-5">
          {error && (
            <div className="rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Add people by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-sm"
            />
            <button
              onClick={handleShare}
              disabled={loading}
              aria-label={loading ? "Sending share invite" : "Send share invite"}
              title={loading ? "Sending..." : "Send"}
              className="inline-flex items-center justify-center rounded-lg bg-accent-primary px-3 py-2 text-text-inverse disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
            <section className="flex min-h-0 flex-col px-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">People with access</p>
                <span className="text-xs text-text-muted">{shares.length}</span>
              </div>

              <div className="mt-2 max-h-56 flex-1 divide-y divide-border-subtle overflow-y-auto pr-1 sm:max-h-64">
                {shares.length === 0 && (
                  <p className="text-sm text-text-muted">Only you have access.</p>
                )}

                {shares.map((share) => (
                  <div
                    key={share.userId}
                    className="flex items-start justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium leading-snug">{share.email}</p>
                      <p className="text-xs text-text-secondary">Can view</p>
                    </div>
                    <button
                      onClick={() => void handleRemoveShare(share.userId)}
                      disabled={removingShareUserId === share.userId}
                      className="rounded p-1 text-destructive hover:text-destructive-strong disabled:opacity-50"
                      title="Remove access"
                      aria-label={`Remove ${share.email} access`}
                    >
                      {removingShareUserId === share.userId ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex min-h-0 flex-col px-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">Public links</p>
                <div className="flex items-center gap-3">
                  {publicLinks.length > 0 && (
                    <button
                      onClick={() => setShowRevokeAllConfirm(true)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Revoke all
                    </button>
                  )}
                  {!showExpirySelector && (
                    <button
                      onClick={() => setShowExpirySelector(true)}
                      className="text-xs font-medium text-accent-primary hover:underline"
                    >
                      Create link
                    </button>
                  )}
                </div>
              </div>

              {showExpirySelector && (
                <div className="mt-3 space-y-3 rounded-lg bg-bg-muted/50 p-3">
                  <div className="inline-flex rounded-lg bg-surface-default p-1">
                    <button
                      type="button"
                      onClick={() => setExpiryMode("preset")}
                      className={`rounded px-2.5 py-1 text-xs transition-colors ${expiryMode === "preset"
                        ? "bg-accent-soft text-accent-primary"
                        : "text-text-secondary hover:bg-bg-muted"
                        }`}
                    >
                      Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpiryMode("custom")}
                      className={`rounded px-2.5 py-1 text-xs transition-colors ${expiryMode === "custom"
                        ? "bg-accent-soft text-accent-primary"
                        : "text-text-secondary hover:bg-bg-muted"
                        }`}
                    >
                      Custom
                    </button>
                  </div>

                  {expiryMode === "preset" ? (
                    <div className="grid grid-cols-2 gap-2">
                      {presetExpiryOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedPreset(option.value)}
                          className={`rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${selectedPreset === option.value
                            ? "bg-accent-soft text-accent-primary"
                            : "bg-surface-default text-text-secondary hover:bg-bg-muted"
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <label className="space-y-1">
                          <span className="text-[11px] text-text-secondary">Days</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={customDays}
                            onChange={(e) => setCustomDays(e.target.value)}
                            className="w-full rounded border border-border-subtle bg-surface-default px-2 py-1.5 text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-text-secondary">Hr</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={customHours}
                            onChange={(e) => setCustomHours(e.target.value)}
                            className="w-full rounded border border-border-subtle bg-surface-default px-2 py-1.5 text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-text-secondary">Min</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            className="w-full rounded border border-border-subtle bg-surface-default px-2 py-1.5 text-xs"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {customExpiryError && expiryMode === "custom" ? (
                    <p className="text-[11px] text-destructive">{customExpiryError}</p>
                  ) : (
                    <p className="text-[11px] text-text-muted">{expirySummary}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreatePublicLink}
                      disabled={creatingLink || Boolean(customExpiryError)}
                      className="rounded bg-accent-primary px-3 py-1.5 text-xs text-text-inverse disabled:opacity-50"
                    >
                      {creatingLink ? "Creating..." : "Create link"}
                    </button>
                    <button
                      onClick={() => setShowExpirySelector(false)}
                      className="text-xs text-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 max-h-56 flex-1 divide-y divide-border-subtle overflow-y-auto pr-1 sm:max-h-64">
                {publicLinks.length === 0 && (
                  <p className="text-xs text-text-muted">No public links created.</p>
                )}

                {publicLinks.map((link) => {
                  const fullUrl = `${window.location.origin}/public/${link.token}`;

                  return (
                    <div
                      key={link.shareId}
                      className="flex items-start justify-between gap-2 py-2.5"
                    >
                      <div className="flex-1 overflow-hidden">
                        <p className="break-all text-xs leading-snug">{fullUrl}</p>
                        {link.expiresAt && (
                          <p className="text-[10px] text-text-muted">
                            Expires: {new Date(link.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyPublicLink(link.token, link.shareId)}
                          className="text-xs text-accent-primary hover:underline"
                        >
                          {copiedId === link.shareId ? "Copied" : "Copy"}
                        </button>

                        <button
                          onClick={() => handleRevokePublicLink(link.shareId)}
                          className="text-destructive hover:text-destructive-strong"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] text-text-muted">
                Anyone with a public link can view this media.
              </p>
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showRevokeAllConfirm}
        title="Revoke all public links?"
        description="Anyone using these links will immediately lose access to this media."
        confirmLabel="Revoke all"
        noLabel="No"
        cancelLabel="Cancel"
        tone="destructive"
        busy={revokingAllPublicLinks}
        onConfirm={() => void handleRevokeAllPublicLinks()}
        onNo={() => setShowRevokeAllConfirm(false)}
        onCancel={() => setShowRevokeAllConfirm(false)}
      />
    </div>
  );
}