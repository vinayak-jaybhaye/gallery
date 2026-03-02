import { Request, Response } from "express";
import {
  listMediaService,
  getMediaByIdService,
  updateMediaService,
  deleteMediaService,
  recoverMediaService,
  listDeletedMediaService,
  emptyTrashService,
  deleteFromTrashService,
  shareMediaService,
  removeMediaShareService,
  createPublicShareService,
  revokePublicShareService,
  getPublicMediaByTokenService,
  listMyPublicLinksService,
  listMediaSharedWithMeService,
  listMediaSharedByMeService,
  listMediaSharesService
} from "./media.service";

export async function listMedia(
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

  const result = await listMediaService({
    userId,
    lastCreatedAt: cursor ? new Date(cursor) : undefined,
    limit,
    type,
    albumId
  });

  res.json(result);
}

export async function getMediaById(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.id;

  const media = await getMediaByIdService({
    userId,
    mediaId
  });

  res.json(media);
}

export async function updateMedia(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.id;

  const updated = await updateMediaService({
    userId,
    mediaId,
    data: req.body
  });

  res.json(updated);
}

export async function deleteMedia(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const mediaIds = req.body.mediaIds;

  const result = await deleteMediaService({
    userId,
    mediaIds
  });

  res.json(result);
}

export async function recoverMedia(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const mediaIds = req.body.mediaIds;

  const result = await recoverMediaService({
    userId,
    mediaIds
  });

  res.json(result);
}

export async function listDeletedMedia(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listDeletedMediaService({
    userId,
    cursor: cursor ? { id: cursor } : undefined,
    limit
  });

  res.json(result);
}

export async function emptyTrash(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;

  const result = await emptyTrashService(userId);

  res.json(result);
}

export async function deleteFromTrash(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const mediaIds = req.body.mediaIds;

  const result = await deleteFromTrashService({
    userId,
    mediaIds
  });

  res.json(result);
}
// media sharing
export async function shareMedia(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;
  const { email } = req.body;

  const result = await shareMediaService({
    userId,
    mediaId,
    email,
  });

  res.status(201).json(result);
}

export async function removeMediaShare(
  req: Request<{ mediaId: string; userId: string }>,
  res: Response
) {
  const ownerId = req.user!.id;
  const mediaId = req.params.mediaId;
  const targetUserId = req.params.userId;

  const result = await removeMediaShareService({
    userId: ownerId,
    mediaId,
    targetUserId,
  });

  res.json(result);
}

export async function createPublicShare(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;
  const { expiresInDays } = req.body;

  const result = await createPublicShareService({
    userId,
    mediaId,
    expiresInDays,
  });

  res.status(201).json(result);
}

export async function revokePublicShare(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const shareIds = req.body.shareIds;

  const result = await revokePublicShareService({ userId, shareIds });

  res.json(result);
}

// public route
export async function getPublicMediaByToken(
  req: Request<{ token: string }>,
  res: Response
) {
  const token = req.params.token;

  const result = await getPublicMediaByTokenService(token);

  res.json(result);
}

export async function listMediaSharedWithMe(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listMediaSharedWithMeService({
    userId,
    cursor,
    limit,
  });

  res.json(result);
}

export async function listMediaSharedByMe(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listMediaSharedByMeService({
    userId,
    cursor,
    limit,
  });

  res.json(result);
}

export async function listMyPublicLinks(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;
  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listMyPublicLinksService({
    userId,
    cursor,
    limit,
  });

  res.json(result);
}

export async function listMediaShares(
  req: Request<{ mediaId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const mediaId = req.params.mediaId;

  const result = await listMediaSharesService({
    userId,
    mediaId,
  });

  res.json(result);
}