import { AlbumGrid } from "@/components/albums";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createAlbum } from "@/api/albums";
import { useOutletContext } from "react-router-dom";
import type { LayoutContext } from "@/components/layout/AppLayout";

export default function Albums() {
  const outlet = useOutletContext<LayoutContext | undefined>();
  const searchQuery = outlet?.searchQuery ?? "";
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Create and refresh albums
      await createAlbum({ title });
      setTitle("");
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err?.message || "Failed to create album");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-16 z-20 mb-6 bg-bg-app pb-4 pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-text-primary sm:text-2xl">Albums</h1>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-strong active:scale-95"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            New Album
          </button>
        </div>

        {searchQuery.trim() && (
          <p className="mt-2 max-w-full truncate text-xs text-text-muted">
            Searching for: <span className="font-medium text-text-primary">{searchQuery.trim()}</span>
          </p>
        )}

        {showForm && (
          <div className="mt-4 rounded-xl border border-border-subtle bg-surface-raised p-4">
            <h2 className="text-sm font-semibold text-text-primary">Create a new album</h2>
            <p className="mt-0.5 text-xs text-text-muted">Give it a clear name so it's easy to find later.</p>

            <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Album title"
                className="w-full rounded-lg border border-border-subtle bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                required
                minLength={1}
                maxLength={255}
                disabled={loading}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-strong disabled:opacity-50"
                  disabled={loading || !title.trim()}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg bg-bg-muted px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-selected"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
            {error && <div className="mt-3 rounded-lg bg-bg-destructive px-3 py-2 text-sm text-text-destructive-foreground">{error}</div>}
          </div>
        )}
      </div>

      <AlbumGrid refreshKey={refreshKey} searchQuery={searchQuery} />
    </div >
  );
}