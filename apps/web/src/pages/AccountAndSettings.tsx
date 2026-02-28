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

      await updatePasswordAuthStatus({
        passwordAuthEnabled: enabled,
        password: enabled ? password : undefined,
      });

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
    return <div className="p-6">Loading account...</div>;
  }

  if (!account) {
    return <div className="p-6 text-red-500">Failed to load account</div>;
  }

  const storageUsedMB = (account.storageUsedBytes / 1024 / 1024).toFixed(2);
  const storageQuotaMB = (account.storageQuotaBytes / 1024 / 1024).toFixed(2);
  const usagePercent =
    (account.storageUsedBytes / account.storageQuotaBytes) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Account & Settings</h1>

      {/* Account Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 space-y-3">
        <p><strong>Email:</strong> {account.email}</p>
        <p><strong>User ID:</strong> {account.id}</p>
      </div>

      {/* Storage Usage */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 space-y-3">
        <h2 className="font-semibold">Storage</h2>

        <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {storageUsedMB} MB / {storageQuotaMB} MB used
        </p>
      </div>

      {/* Password Authentication */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold">Password Authentication</h2>

        <div className="flex items-center justify-between">
          <span>
            {account.passwordAuthEnabled
              ? "Enabled"
              : "Disabled"}
          </span>

          <button
            disabled={saving}
            onClick={() =>
              handlePasswordToggle(!account.passwordAuthEnabled)
            }
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {account.passwordAuthEnabled ? "Disable" : "Enable"}
          </button>
        </div>

        {!account.passwordAuthEnabled && (
          <div className="space-y-2">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 dark:bg-zinc-800"
            />
            <p className="text-xs text-gray-500">
              Minimum 8 characters recommended
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 flex items-center justify-between">
        <span>Theme</span>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-700"
        >
          {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        </button>
      </div>
    </div>
  );
}