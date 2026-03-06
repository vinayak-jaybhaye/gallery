import { api } from "@/lib/axios";

export type AlbumListItem = {
  id: string;
  title: string;
  createdAt: Date;
  count: number;
  coverMediaUrl: string | null;
  ownerId: string;
  userRole: "owner" | "viewer" | "editor";
};

export type ListAlbumsResponse = {
  items: AlbumListItem[];
  nextCursor: string | null;
};

export async function listAlbums(params?: { cursor?: string; limit?: number; search?: string }) {
  try {
    const { data } = await api.get<ListAlbumsResponse>("/albums", { params });
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to fetch albums");
  }
}

export type AlbumResponse = AlbumListItem;

export async function getAlbumById(id: string) {
  try {
    const { data } = await api.get<AlbumResponse>(`/albums/${id}`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to fetch album");
  }
}

// Create a new album.
export async function createAlbum(input: { title: string; coverMediaId?: string }) {
  try {
    const { data } = await api.post<AlbumListItem>("/albums", input);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to create album");
  }
}

// Update album details.
export async function updateAlbum(id: string, input: { title?: string; coverMediaId?: string | null }) {
  try {
    const { data } = await api.patch<{ success: boolean }>(`/albums/${id}`, input);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to update album");
  }
}

// Delete an album by ID
export async function deleteAlbum(id: string) {
  try {
    const { data } = await api.delete<{ success: boolean }>(`/albums/${id}`);
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to delete album");
  }
}

export async function addMediaToAlbum(id: string, mediaIds: string[]) {
  try {
    const { data } = await api.post<{ success: boolean; addedCount: number }>(`/albums/${id}/media`, { mediaIds });
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to add media to album");
  }
}

export async function removeMediaFromAlbum(id: string, mediaIds: string[]) {
  try {
    const { data } = await api.delete<{ success: boolean; removedCount: number }>(`/albums/${id}/media`, { data: { mediaIds } });
    return data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || "Failed to remove media from album");
  }
}

export type AlbumShareResponse = {
  id: string;
  email: string;
  avatarUrl?: string | null;
  role: "viewer" | "editor";
};

export type AlbumShareListItem = {
  userId: string;
  role: "owner" | "viewer" | "editor";
  createdAt: string | null;
  user: {
    id: string;
    email: string;
    avatarUrl?: string | null;
  };
};

export async function listAlbumShares(id: string) {
  const { data } = await api.get<{ items: AlbumShareListItem[] }>(`/albums/${id}/shares`);
  return data;
}

export async function shareAlbum(id: string, input: { email: string; role: "viewer" | "editor" }) {
  const { data } = await api.post<AlbumShareResponse>(`/albums/${id}/shares`, input);
  return data;
}

export async function updateAlbumShare(id: string, shareId: string, role: "viewer" | "editor") {
  const { data } = await api.patch<{ success: boolean }>(`/albums/${id}/shares/${shareId}`, { role });
  return data;
}

export async function removeAlbumShare(id: string, shareId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/albums/${id}/shares/${shareId}`);
  return data;
}

export async function leaveAlbum(id: string) {
  const { data } = await api.post<{ success: boolean }>(`/albums/${id}/leave`);
  return data;
}