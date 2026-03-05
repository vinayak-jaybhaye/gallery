import { create } from "zustand";

type User = {
  id: string;
  email: string;
  avatarUrl?: string;
};

type AuthStore = {
  user: User | null;
  loading: boolean;

  login: (data: { accessToken: string; user: User }) => void;
  logout: () => void;
  initialize: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  initialize: () => {
    const stored = localStorage.getItem("user");
    if (stored) {
      set({ user: JSON.parse(stored), loading: false });
    } else {
      set({ loading: false });
    }
  },

  login: (data) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    set({ user: data.user, loading: false });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    set({ user: null });
  },
}));