import { Request, Response } from "express";
import {
  listMediaLibraryService,
  getMediaDetailsService,
  updateMediaDetailsService,
  moveMediaToTrashService,
  restoreMediaFromTrashService,
  listMediaTrashService,
  emptyMediaTrashService,
  permanentlyDeleteMediaFromTrashService,
  createMediaShareService,
  deleteMediaShareService,
  createPublicMediaLinkService,
  revokePublicMediaLinksService,
  getPublicMediaByTokenService,
  listOwnedPublicLinksService,
  listReceivedMediaService,
  listSentMediaService,
  listMediaShareRecipientsService,
  listMediaPublicLinksService
} from "./media.service";
import { decodeTimeIdCursor } from "@/utils/paginationCursor";

export async function listMediaLibraryHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;

  const { cursor, limit, type, albumId } = req.query as {
    cursor?: string;
    limit?: number;
    type?: "image" | "video";
    albumId?: string;
  };

  const result = await listMediaLibraryService({
    userId,
    cursor: cursor ? decodeTimeIdCursor(cursor) : undefined,
    limit,
    type,
    albumId
  });

  res.json(result);
}

export async function getMediaDetailsHandler(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;

  const media = await getMediaDetailsService({
    userId,
    mediaId
  });

  res.json(media);
}

export async function updateMediaDetailsHandler(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;

  const updated = await updateMediaDetailsService({
    userId,
    mediaId,
    data: req.body
  });

  res.json(updated);
}

export async function moveMediaToTrashHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const mediaIds = req.body.mediaIds;

  const result = await moveMediaToTrashService({
    userId,
    mediaIds
  });

  res.json(result);
}

export async function restoreMediaFromTrashHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const mediaIds = req.body.mediaIds;

  const result = await restoreMediaFromTrashService({
    userId,
    mediaIds
  });

  res.json(result);
}

export async function listMediaTrashHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listMediaTrashService({
    userId,
    cursor: cursor ? decodeTimeIdCursor(cursor) : undefined,
    limit
  });

  res.json(result);
}

export async function emptyMediaTrashHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;

  const result = await emptyMediaTrashService(userId);

  res.json(result);
}

export async function permanentlyDeleteMediaFromTrashHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const mediaIds = req.body.mediaIds;

  const result = await permanentlyDeleteMediaFromTrashService({
    userId,
    mediaIds
  });

  res.json(result);
}

export async function createMediaShareHandler(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;
  const { email } = req.body;

  const result = await createMediaShareService({
    userId,
    mediaId,
    email,
  });

  res.status(201).json(result);
}

export async function deleteMediaShareHandler(
  req: Request<{ mediaId: string; targetUserId: string }>,
  res: Response
) {
  const ownerId = req.user!.id;
  const mediaId = req.params.mediaId;
  const targetUserId = req.params.targetUserId;

  const result = await deleteMediaShareService({
    userId: ownerId,
    mediaId,
    targetUserId,
  });

  res.json(result);
}

export async function createPublicMediaLinkHandler(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;
  const { expiresInSeconds } = req.body;

  const result = await createPublicMediaLinkService({
    userId,
    mediaId,
    expiresInSeconds,
  });

  res.status(201).json(result);
}

export async function revokePublicMediaLinksHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const shareIds = req.body.shareIds;

  const result = await revokePublicMediaLinksService({ userId, shareIds });

  res.json(result);
}

export async function getPublicMediaByTokenHandler(
  req: Request<{ token: string }>,
  res: Response
) {
  const token = req.params.token;

  const result = await getPublicMediaByTokenService(token);

  res.json(result);
}

export async function listReceivedMediaHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listReceivedMediaService({
    userId,
    cursor: cursor ? decodeTimeIdCursor(cursor) : undefined,
    limit,
  });

  res.json(result);
}

export async function listSentMediaHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listSentMediaService({
    userId,
    cursor: cursor ? decodeTimeIdCursor(cursor) : undefined,
    limit,
  });

  res.json(result);
}

export async function listMediaPublicLinksHandler(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;

  const result = await listMediaPublicLinksService({
    userId,
    mediaId,
  });

  res.json(result);
}

export async function listOwnedPublicLinksHandler(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listOwnedPublicLinksService({
    userId,
    cursor: cursor ? decodeTimeIdCursor(cursor) : undefined,
    limit,
  });

  res.json(result);
}

export async function listMediaShareRecipientsHandler(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;

  const result = await listMediaShareRecipientsService({
    userId,
    mediaId,
  });

  res.json(result);
}
