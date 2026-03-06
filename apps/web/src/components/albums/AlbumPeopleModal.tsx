import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus, X } from "lucide-react";
import {
  leaveAlbum,
  listAlbumShares,
  removeAlbumShare,
  shareAlbum,
  type AlbumShareListItem,
  updateAlbumShare,
} from "@/api/albums";
import Avatar from "@/components/Avatar";
import { useAuthStore } from "@/store/authStore";
import { Loader } from "@/components/ui";

function roleBadgeClass(role: "owner" | "viewer" | "editor") {
  if (role === "owner") return "bg-accent-soft text-accent-primary";
  if (role === "editor") return "bg-emerald-500/15 text-emerald-600";
  return "bg-bg-muted text-text-secondary";
}

export type AlbumPeopleModalProps = {
  open: boolean;
  onClose: () => void;
  album: {
    id: string;
    userRole: "owner" | "viewer" | "editor";
  } | null;
};

export default function AlbumPeopleModal({
  open,
  onClose,
  album,
}: AlbumPeopleModalProps) {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AlbumShareListItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const albumId = album?.id;
  const isOwner = album?.userRole === "owner";

  const loadShares = useCallback(async () => {
    if (!albumId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await listAlbumShares(albumId);
      setUsers(response.items);
    } catch (err: any) {
      setError(err?.message || "Failed to load album members");
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (!open || !albumId) return;
    void loadShares();
  }, [open, albumId, loadShares]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!albumId || !inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      setError(null);
      await shareAlbum(albumId, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      setInviteRole("viewer");
      await loadShares();
    } catch (err: any) {
      setError(err?.message || "Failed to add user");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: "viewer" | "editor") {
    if (!albumId) return;

    try {
      setMemberActionUserId(userId);
      setError(null);
      await updateAlbumShare(albumId, userId, role);
      setUsers((prev) => prev.map((item) => (item.userId === userId ? { ...item, role } : item)));
    } catch (err: any) {
      setError(err?.message || "Failed to update user role");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!albumId) return;

    try {
      setMemberActionUserId(userId);
      setError(null);
      await removeAlbumShare(albumId, userId);
      setUsers((prev) => prev.filter((item) => item.userId !== userId));
    } catch (err: any) {
      setError(err?.message || "Failed to remove user");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleLeaveAlbum() {
    if (!albumId) return;
    try {
      setLeaveLoading(true);
      setError(null);
      await leaveAlbum(albumId);
      onClose();
      navigate("/albums");
    } catch (err: any) {
      setError(err?.message || "Leave album API is not available yet.");
    } finally {
      setLeaveLoading(false);
    }
  }

  if (!open || !albumId || !album) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Album People</h2>
            <p className="text-xs text-text-secondary">Members who can access this album</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary transition hover:bg-bg-muted"
            aria-label="Close members modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {isOwner && (
            <form onSubmit={handleInvite} className="mb-4 rounded-xl border border-border-subtle bg-surface-default p-3">
              <p className="mb-2 text-sm font-medium text-text-primary">Add user to album</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="User email"
                  className="w-full rounded-lg border border-border-subtle bg-bg-muted px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  disabled={inviteLoading}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                  className="rounded-lg border border-border-subtle bg-bg-muted px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  disabled={inviteLoading}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-50"
                  disabled={inviteLoading || !inviteEmail.trim()}
                >
                  {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Add
                </button>
              </div>
            </form>
          )}

          {loading && (
            <div className="py-2">
              <Loader size="sm" label="Loading members..." />
            </div>
          )}
          {!loading && error && (
            <div className="rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">
              {error}
            </div>
          )}
          {!loading && !error && users.length === 0 && (
            <p className="text-sm text-text-secondary">No users found for this album.</p>
          )}

          {!loading && !error && users.length > 0 && (
            <ul className="space-y-2">
              {users.map((share) => {
                const isCurrentUser = share.user.id === currentUserId;
                return (
                  <li
                    key={share.userId}
                    className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-default px-3 py-2"
                  >
                    <Avatar
                      src={share.user.avatarUrl}
                      email={share.user.email}
                      alt={share.user.email}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {share.user.email}
                        {isCurrentUser ? " (You)" : ""}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {share.createdAt
                          ? `Added ${new Date(share.createdAt).toLocaleDateString()}`
                          : "Album owner"}
                      </p>
                    </div>
                    {isOwner && share.role !== "owner" ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={share.role}
                          onChange={(e) => handleRoleChange(share.userId, e.target.value as "viewer" | "editor")}
                          disabled={memberActionUserId === share.userId}
                          className="rounded-md border border-border-subtle bg-bg-muted px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                        </select>
                        <button
                          onClick={() => handleRemoveUser(share.userId)}
                          disabled={memberActionUserId === share.userId}
                          className="rounded-md px-2 py-1 text-xs text-text-secondary transition hover:bg-bg-muted disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleBadgeClass(share.role)}`}>
                        {share.role}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isOwner && (
          <div className="border-t border-border-subtle px-5 py-3">
            <button
              onClick={handleLeaveAlbum}
              disabled={leaveLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {leaveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Leave album
            </button>
          </div>
        )}
      </div>
    </div>
  );
}