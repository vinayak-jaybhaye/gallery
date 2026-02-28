import { Request, Response } from "express";
import {
  listMediaService,
  getMediaByIdService,
  updateMediaService,
  deleteMediaService,
  recoverMediaService,
  listDeletedMediaService,
  emptyTrashService,
  deleteFromTrashService
} from "./media.service";

export async function listMedia(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;

  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: number;
  };

  const result = await listMediaService({
    userId,
    lastCreatedAt: cursor ? new Date(cursor) : undefined,
    limit
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