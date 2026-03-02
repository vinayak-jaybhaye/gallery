import { api } from "@/lib/axios";

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    avatarUrl: string
  };
};

export async function loginWithGoogle(idToken: string) {
  const { data } = await api.post<LoginResponse>("/auth/google", {
    idToken,
  });
  return data;
}

export async function loginWithEmailPassword(email: string, password: string) {
  const { data } = await api.post<LoginResponse>("/auth/credentials-login", {
    email,
    password,
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}