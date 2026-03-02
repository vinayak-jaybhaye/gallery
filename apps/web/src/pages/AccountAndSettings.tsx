import { getAccountInfo, updatePasswordAuthStatus } from "@/api/user";
import type { AccountInfo } from "@/api/user";
import { useTheme } from "@/hooks/useTheme";
import { useEffect, useState } from "react";

export default function AccountAndSettings() {
  const { theme, toggleTheme } = useTheme();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const info = await getAccountInfo();
        console.log("Account Info:", info);
        setAccount(info);
      } catch (err) {
        setError("Failed to load account info");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handlePasswordToggle(enabled: boolean) {
    if (!account) return;

    try {
      setSaving(true);
      setError(null);

      const response = await updatePasswordAuthStatus({
        passwordAuthEnabled: enabled,
        password: enabled ? password : undefined,
      });

      console.log(response);

      setAccount({
        ...account,
        passwordAuthEnabled: enabled,
      });

      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update password settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-muted">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading account...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-error font-medium">Failed to load account</p>
        </div>
      </div>
    );
  }

  const storageUsedMB = (account.storageUsedBytes / 1024 / 1024).toFixed(2);
  const storageQuotaMB = (account.storageQuotaBytes / 1024 / 1024).toFixed(2);
  const usagePercent = (account.storageUsedBytes / account.storageQuotaBytes) * 100;

  return (
    <div className="min-h-screen bg-bg-app p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your account preferences</p>
        </div>

        {/* Account Info */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="text-text-secondary text-sm">Email</span>
              <span className="text-text-primary font-medium">{account.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary text-sm">User ID</span>
              <span className="text-text-muted text-sm font-mono">{account.id}</span>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Storage
          </h2>

          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">{storageUsedMB} MB used</span>
              <span className="text-text-muted">{storageQuotaMB} MB total</span>
            </div>
            <div className="w-full bg-bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${usagePercent > 90 ? "bg-error" : usagePercent > 70 ? "bg-warning" : "bg-accent-primary"
                  }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-text-muted">
            {usagePercent.toFixed(1)}% of storage used
          </p>
        </div>

        {/* Password Authentication */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Password Authentication
          </h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-primary font-medium">
                {account.passwordAuthEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="text-text-muted text-sm">
                {account.passwordAuthEnabled
                  ? "You can sign in with your password"
                  : "Enable to use password for sign in"
                }
              </p>
            </div>

            <button
              disabled={saving}
              onClick={() => handlePasswordToggle(!account.passwordAuthEnabled)}
              className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${account.passwordAuthEnabled
                  ? "bg-bg-muted text-text-secondary hover:bg-surface-selected"
                  : "bg-accent-primary text-text-inverse hover:bg-accent-strong"
                }`}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : account.passwordAuthEnabled ? "Disable" : "Enable"}
            </button>
          </div>

          {!account.passwordAuthEnabled && (
            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-muted border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
              />
              <p className="text-xs text-text-muted">
                Minimum 8 characters recommended
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Appearance
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary font-medium">Theme</p>
              <p className="text-text-muted text-sm">
                Currently using {theme === "dark" ? "dark" : "light"} mode
              </p>
            </div>

            <button
              onClick={toggleTheme}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-bg-muted text-text-primary rounded-lg text-sm font-medium hover:bg-surface-selected transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}