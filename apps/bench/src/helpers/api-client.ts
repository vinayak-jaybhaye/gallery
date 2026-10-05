/**
 * Authenticated HTTP client helper for benchmarking the API.
 * Logs in using dev credentials and reuses the JWT token.
 */
import axios, { AxiosInstance } from "axios";

let API_URL = process.env.VITE_API_URL || process.env.API_URL || "http://localhost:3000";
API_URL = API_URL.replace("${HOST}", process.env.HOST || "localhost");

let cachedToken: string | null = null;

/**
 * Get a JWT token by logging in via dev credentials.
 */
export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await axios.post(`${API_URL}/auth/credentials-login`, {
    email: process.env.DEV_USER_EMAIL || "dev@gallery.local",
    password: "devdev",
  });

  cachedToken = res.data.accessToken;
  if (!cachedToken) throw new Error("Failed to get auth token");
  return cachedToken;
}

/**
 * Create an authenticated Axios instance for API calls.
 */
export async function createAuthClient(): Promise<AxiosInstance> {
  const token = await getAuthToken();

  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    validateStatus: () => true, // Don't throw on non-2xx — we want to measure errors too
  });
}

/**
 * Create a raw (unauthenticated) Axios instance.
 */
export function createRawClient(): AxiosInstance {
  return axios.create({
    baseURL: API_URL,
    validateStatus: () => true,
  });
}

export function getApiUrl(): string {
  return API_URL;
}
