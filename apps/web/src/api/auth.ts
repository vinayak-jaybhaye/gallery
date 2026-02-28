import { api } from "@/lib/axios";

type GoogleLoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    avatarUrl: string
  };
};

export async function loginWithGoogle(idToken: string) {
  const { data } = await api.post<GoogleLoginResponse>("/auth/google", {
    idToken,
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}