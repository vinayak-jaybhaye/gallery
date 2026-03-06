import { useEffect } from "react";
import { Loader2, X } from "lucide-react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  noLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  busy?: boolean;
  showNoButton?: boolean;
  onConfirm: () => void;
  onNo?: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Yes",
  noLabel = "No",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  showNoButton = true,
  onConfirm,
  onNo,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open || busy) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmButtonClass = tone === "destructive"
    ? "bg-bg-destructive text-text-destructive-foreground hover:opacity-90"
    : "bg-accent-primary text-text-inverse hover:bg-accent-strong";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-description" : undefined}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-raised p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            {description ? (
              <p id="confirm-dialog-description" className="text-sm text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>

          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-bg-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {showNoButton ? (
            <button
              type="button"
              disabled={busy}
              onClick={onNo ?? onCancel}
              className="rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-muted disabled:opacity-50"
            >
              {noLabel}
            </button>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-muted disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${confirmButtonClass}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}