import { api } from "@/lib/axios";
import { normalizeMediaId } from "@/lib/utils";

const MEDIA_API_BASE = "/media";
const PUBLIC_API_BASE = "/public";
const DEFAULT_PAGE_SIZE = 20;

const mediaRoutes = {
  collection: MEDIA_API_BASE,
  item: (mediaId: string) => `${MEDIA_API_BASE}/${mediaId}`,
  trash: `${MEDIA_API_BASE}/trash`,
  trashAll: `${MEDIA_API_BASE}/trash/all`,
  trashRestore: `${MEDIA_API_BASE}/trash/restore`,
  sharesReceived: `${MEDIA_API_BASE}/shares/received`,
  sharesSent: `${MEDIA_API_BASE}/shares/sent`,
  publicLinksOwned: `${MEDIA_API_BASE}/shares/public`,
  mediaShares: (mediaId: string) => `${MEDIA_API_BASE}/${mediaId}/shares`,
  mediaShareMember: (mediaId: string, targetUserId: string) =>
    `${MEDIA_API_BASE}/${mediaId}/shares/${targetUserId}`,
  mediaPublicLinks: (mediaId: string) => `${MEDIA_API_BASE}/${mediaId}/shares/public`,
  publicMediaByToken: (token: string) => `${PUBLIC_API_BASE}/${token}`,
};

type CursorPaginatedResponse<T> = {
  items: T[];
  nextCursor?: string;
};

function cursorParams(cursor?: string) {
  return cursor ? { cursor } : {};
}

export type MediaType = "image" | "video";

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
  shareWithMeDate?: string;
};

export type ListMediaResponse = CursorPaginatedResponse<MediaListItem>;

export type MediaDetail = {
  id: string;
  ownerId: string;
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

export type SharedMediaItem = {
  id: string;
  type: "image" | "video";
  title: string;
  createdAt: string;
  shareCount: number;
  mediaId?: string;
};

export type PublicLink = {
  shareId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  mediaId?: string;
  title?: string;
  type?: "image" | "video";
  thumbnailUrl?: string;
};

export type MediaShare = {
  userId: string;
  email: string;
  avatarUrl: string | null;
  sharedAt: Date;
};

export type PublicMediaResponse = {
  id: string;
  title: string | null;
  createdAt: Date;
  takenAt: Date | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
  originalUrl: string;
  thumbnailUrl: string | null;
};

// Media library
export async function listMedia(
  cursor?: string,
  mediaType?: MediaType,
  albumId?: string
) {
  const res = await api.get<ListMediaResponse>(mediaRoutes.collection, {
    params: {
      ...cursorParams(cursor),
      limit: DEFAULT_PAGE_SIZE,
      ...(mediaType && { type: mediaType }),
      ...(albumId && { albumId }),
    },
  });

  return res.data;
}

export async function getMedia(id: string) {
  const res = await api.get<MediaDetail>(mediaRoutes.item(id));
  return res.data;
}

export async function deleteMedia(mediaIds: string[]) {
  const res = await api.delete<{ success: boolean }>(mediaRoutes.collection, {
    data: { mediaIds },
  });

  return res.data;
}

// Trash
export async function listDeletedMedia(cursor?: string) {
  const res = await api.get<CursorPaginatedResponse<TrashItem>>(mediaRoutes.trash, {
    params: {
      ...cursorParams(cursor),
      limit: DEFAULT_PAGE_SIZE,
    },
  });

  return res.data;
}

export async function recoverMedia(mediaIds: string[]) {
  const res = await api.post<{ success: boolean }>(mediaRoutes.trashRestore, {
    mediaIds,
  });

  return res.data;
}

export async function deleteFromTrash(mediaIds: string[]) {
  const res = await api.delete<{ success: boolean }>(mediaRoutes.trash, {
    data: { mediaIds },
  });

  return res.data;
}

export async function emptyTrash() {
  const res = await api.delete<{ success: boolean }>(mediaRoutes.trashAll);
  return res.data;
}

// Sharing and public links
export async function shareMedia(mediaId: string, email: string) {
  const res = await api.post<{ success: boolean }>(mediaRoutes.mediaShares(mediaId), {
    email,
  });

  return res.data;
}

export async function removeMediaShare(mediaId: string, userId: string) {
  const res = await api.delete<{ success: boolean }>(mediaRoutes.mediaShareMember(mediaId, userId));
  return res.data;
}

export async function createPublicShare(mediaId: string, expiresInSeconds?: number) {
  const res = await api.post<{ success: boolean; url: string }>(
    mediaRoutes.mediaPublicLinks(mediaId),
    expiresInSeconds ? { expiresInSeconds } : {}
  );

  return res.data;
}

export async function revokePublicShare(shareIds: string[]) {
  const res = await api.delete<{ success: boolean }>(mediaRoutes.publicLinksOwned, {
    data: { shareIds },
  });

  return res.data;
}

export async function listMediaSharedWithMe(cursor?: string, limit?: number) {
  const res = await api.get<CursorPaginatedResponse<MediaListItem>>(mediaRoutes.sharesReceived, {
    params: {
      ...cursorParams(cursor),
      limit: limit ?? DEFAULT_PAGE_SIZE,
    },
  });

  return res.data;
}

export async function listMediaSharedByMe(cursor?: string) {
  const res = await api.get<CursorPaginatedResponse<SharedMediaItem>>(mediaRoutes.sharesSent, {
    params: {
      ...cursorParams(cursor),
      limit: DEFAULT_PAGE_SIZE,
    },
  });

  const items = res.data.items
    .map((item) => {
      const mediaId = normalizeMediaId(item.id ?? item.mediaId);
      return mediaId ? { ...item, id: mediaId } : null;
    })
    .filter((item): item is SharedMediaItem => item !== null);

  return {
    ...res.data,
    items,
  };
}

export async function listMyPublicLinks(cursor?: string) {
  const res = await api.get<CursorPaginatedResponse<PublicLink>>(mediaRoutes.publicLinksOwned, {
    params: {
      ...cursorParams(cursor),
      limit: DEFAULT_PAGE_SIZE,
    },
  });

  const items = res.data.items.map((link) => ({
    ...link,
    mediaId: normalizeMediaId(link.mediaId ?? (link as PublicLink & { id?: string }).id),
  }));

  return {
    ...res.data,
    items,
  };
}

export async function getPublicLinksByMediaId(mediaId: string) {
  const res = await api.get<PublicLink[]>(mediaRoutes.mediaPublicLinks(mediaId));
  return res.data;
}

export async function listMediaShares(mediaId: string) {
  const res = await api.get<MediaShare[]>(mediaRoutes.mediaShares(mediaId));
  return res.data;
}

export async function getPublicMedia(token: string) {
  const res = await api.get<PublicMediaResponse>(mediaRoutes.publicMediaByToken(token));
  return res.data;
}