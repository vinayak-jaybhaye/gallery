import axios from "axios";
import getErrorMessage from "@/lib/utils/getErrorMessage";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Intercept request and add clean error message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error && typeof error === "object" && "message" in error) {
      (error as { message: string }).message = getErrorMessage(error, "Request failed.");
    }

    return Promise.reject(error);
  }
);