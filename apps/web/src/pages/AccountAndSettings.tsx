import { getAccountInfo, updatePasswordAuthStatus } from "@/api/user";
import type { AccountInfo } from "@/api/user";
import { useTheme } from "@/hooks/useTheme";
import { getErrorMessage } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Loader } from "@/components/ui";

export default function AccountAndSettings() {
  const { theme, toggleTheme } = useTheme();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const info = await getAccountInfo();
        setAccount(info);
      } catch (err: unknown) {
        setLoadError(getErrorMessage(err, "Failed to load account info"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!actionError) return;

    const timeoutId = window.setTimeout(() => {
      setActionError(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionError]);

  async function handlePasswordToggle(enabled: boolean) {
    if (!account) return;

    try {
      setSaving(true);
      setActionError(null);

      const response = await updatePasswordAuthStatus({
        passwordAuthEnabled: enabled,
        password: enabled ? password : undefined,
      });

      if (!response) {
        throw new Error("Failed to update password settings");
      }

      setAccount({
        ...account,
        passwordAuthEnabled: enabled,
      });

      setPassword("");
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update password settings"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-bg-app p-4 sm:p-6 flex items-center justify-center">
        <Loader size="md" label="Loading account..." />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-full bg-bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-error font-medium">{loadError || "Failed to load account"}</p>
        </div>
      </div>
    );
  }

  const storageUsedMB = (account.storageUsedBytes / 1024 / 1024).toFixed(2);
  const storageQuotaMB = (account.storageQuotaBytes / 1024 / 1024).toFixed(2);
  const usagePercent = account.storageQuotaBytes > 0
    ? (account.storageUsedBytes / account.storageQuotaBytes) * 100
    : 0;
  const usageBadgeClass = usagePercent > 90
    ? "bg-error/12 text-error"
    : usagePercent > 70
      ? "bg-warning/15 text-warning"
      : "bg-accent-soft text-accent-primary";
  const usageBarClass = usagePercent > 90
    ? "bg-error"
    : usagePercent > 70
      ? "bg-warning"
      : "bg-accent-primary";
  const passwordToggleDisabled = saving || (!account.passwordAuthEnabled && !password.trim());

  return (
    <div className="min-h-full bg-bg-app p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-heading font-bold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage your account and preferences.</p>
        </header>

        <section className="rounded-xl border border-border-subtle bg-surface-raised p-5 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary">Account</h2>

          <dl className="mt-4 divide-y divide-border-subtle">
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-text-secondary">Email</dt>
              <dd className="text-sm font-medium text-text-primary">{account.email}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-text-secondary">User ID</dt>
              <dd className="break-all font-mono text-xs text-text-muted sm:text-sm">{account.id}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-border-subtle pt-5">
            <h3 className="text-sm font-semibold text-text-primary">Storage</h3>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-text-secondary">{storageUsedMB} MB used</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${usageBadgeClass}`}>
                {usagePercent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-muted">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${usageBarClass}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">Total quota: {storageQuotaMB} MB</p>
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface-raised p-5 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary">Preferences</h2>

          <div className="mt-4 space-y-5">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Password authentication</p>
                  <p className="text-sm text-text-secondary">
                    {account.passwordAuthEnabled
                      ? "Sign in with password is enabled."
                      : "Enable password sign in for your account."}
                  </p>
                </div>
                <button
                  disabled={passwordToggleDisabled}
                  onClick={() => {
                    const nextEnabledState = !account.passwordAuthEnabled;

                    if (
                      nextEnabledState
                      && passwordInputRef.current
                      && !passwordInputRef.current.reportValidity()
                    ) {
                      return;
                    }

                    void handlePasswordToggle(nextEnabledState);
                  }}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${account.passwordAuthEnabled
                    ? "bg-bg-muted text-text-secondary hover:bg-surface-selected"
                    : "bg-accent-primary text-text-inverse hover:bg-accent-strong"
                    }`}
                >
                  {saving
                    ? "Saving..."
                    : account.passwordAuthEnabled
                      ? "Disable"
                      : "Enable"}
                </button>
              </div>

              {!account.passwordAuthEnabled && (
                <div className="mt-3">
                  <input
                    ref={passwordInputRef}
                    type="password"
                    placeholder="Create password"
                    value={password}
                    required
                    minLength={8}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (actionError) setActionError(null);
                    }}
                    className="w-full rounded-lg border border-border-subtle bg-bg-muted px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  />
                  {actionError && (
                    <div className="mt-2 rounded-lg border border-error/25 bg-error/10 px-3 py-2">
                      <p className="text-sm text-error">{actionError}</p>
                    </div>
                  )}
                </div>
              )}

              {account.passwordAuthEnabled && actionError && (
                <div className="mt-3 rounded-lg border border-error/25 bg-error/10 px-3 py-2">
                  <p className="text-sm text-error">{actionError}</p>
                </div>
              )}
            </div>

            <div className="border-t border-border-subtle pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Theme</p>
                  <p className="text-sm text-text-secondary">
                    Current mode: {theme === "dark" ? "Dark" : "Light"}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="inline-flex items-center justify-center rounded-lg bg-bg-muted px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-selected"
                >
                  {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}