import { api } from "@/lib/axios";

export type MediaListItem = {
  id: string;
  type: "image" | "video";
  title: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  takenAt?: string;
  createdAt: string;
};

export type ListMediaResponse = {
  items: MediaListItem[];
  nextCursor?: string;
};

export type MediaDetail = {
  id: string;
  type: "image" | "video";
  title: string;
  originalUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  takenAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TrashItem = {
  id: string;
  type: "image" | "video";
  durationSeconds?: number;
  title: string;
  sizeBytes: number;
  expiresAt: string;
  thumbnailUrl: string;
};

export type MediaType = "image" | "video";

export async function listMedia(cursor?: string, mediaType?: MediaType, albumId?: string) {
  // TODO:: add albums
  // Ignore album Id for now
  console.log("Media fetching", { cursor, mediaType, albumId });
  const res = await api.get<ListMediaResponse>("/media", {
    params: {
      cursor,
      limit: 20,
      ...(mediaType && { type: mediaType }),
    }
  });
  return res.data;
}

export async function getMedia(id: string) {
  const res = await api.get<MediaDetail>(`/media/${id}`);
  return res.data;
}

export async function deleteMedia(mediaIds: string[]) {
  const res = await api.delete<{ success: boolean }>(`/media`, {
    data: { mediaIds }
  });
  return res.data;
}

export async function listDeletedMedia(cursor?: string) {
  const res = await api.get<{
    items: TrashItem[];
    nextCursor?: string;
  }>("/media/trash", {
    params: {
      ...(cursor && { cursor }),
      limit: 20,
    },
  });
  return res.data;
}

export async function recoverMedia(mediaIds: string[]) {
  const res = await api.post<{ success: boolean }>(
    "/media/recover",
    { mediaIds }
  );
  return res.data;
}

export async function deleteFromTrash(mediaIds: string[]) {
  const res = await api.delete<{ success: boolean }>(
    "/media/trash",
    { data: { mediaIds } }
  );
  return res.data;
}

export async function emptyTrash() {
  const res = await api.delete<{ success: boolean }>(
    "/media/trash/all"
  );
  return res.data;
}