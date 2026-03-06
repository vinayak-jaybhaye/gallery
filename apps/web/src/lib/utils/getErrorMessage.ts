import { AxiosError } from "axios";

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

function getStringFromPayload(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") return payload;

  if (typeof payload === "object") {
    const data = payload as ApiErrorPayload;
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  return null;
}

export default function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return "Unable to reach server. Check your internet connection and try again.";
    }

    const payloadMessage = getStringFromPayload(error.response.data);
    if (payloadMessage) return payloadMessage;

    if (error.message) return error.message;
    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
