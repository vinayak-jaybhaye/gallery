import { api } from "@/lib/axios";

export type AccountInfo = {
  id: string;
  email: string;
  passwordAuthEnabled: boolean;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  avatarUrl?: string | null;
};

export async function getAccountInfo() {
  const res = await api.get<AccountInfo>("/user");
  return res.data;
}

export async function updatePasswordAuthStatus({
  passwordAuthEnabled,
  password,
}: {
  passwordAuthEnabled: boolean;
  password?: string;
}) {
  return api.post("/user/update-password-auth-state", {
    data: {
      passwordAuthEnabled,
      password,
    },
  });
}