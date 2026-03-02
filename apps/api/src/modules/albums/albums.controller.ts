import { Request, Response } from "express";
import {
  createAlbumService,
  listAlbumsService,
  getAlbumByIdService,
  updateAlbumService,
  deleteAlbumService,
  addMediaToAlbumService,
  removeMediaFromAlbumService,
  shareAlbumService,
  updateAlbumShareService,
  removeAlbumShareService,
} from "./albums.service";

export async function createAlbum(req: Request, res: Response) {
  const userId = req.user!.id;
  const { title, mediaIds } = req.body;

  const album = await createAlbumService({
    userId,
    title,
    mediaIds,
  });

  res.status(201).json(album);
}

export async function listAlbums(req: Request, res: Response) {
  const userId = req.user!.id;

  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: string;
  };

  const result = await listAlbumsService({
    userId,
    lastCreatedAt: cursor ? new Date(cursor) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
}

export async function getAlbumById(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.id;

  const album = await getAlbumByIdService({
    userId,
    albumId,
  });

  res.json(album);
}

export async function updateAlbum(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.id;

  const updated = await updateAlbumService({
    userId,
    albumId,
    data: req.body,
  });

  res.json(updated);
}

export async function deleteAlbum(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.id;

  const result = await deleteAlbumService({
    userId,
    albumId,
  });

  res.json(result);
}

export async function addMediaToAlbum(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.id;
  const { mediaIds } = req.body;

  const result = await addMediaToAlbumService({
    userId,
    albumId,
    mediaIds,
  });

  res.json(result);
}

export async function removeMediaFromAlbum(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.id;
  const { mediaIds } = req.body;

  const result = await removeMediaFromAlbumService({
    userId,
    albumId,
    mediaIds,
  });

  res.json(result);
}

export async function shareAlbum(
  req: Request<{ id: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.id;
  const { userId: targetUserId, role } = req.body;

  const share = await shareAlbumService({
    userId,
    albumId,
    targetUserId,
    role,
  });

  res.status(201).json(share);
}

export async function updateAlbumShare(
  req: Request<{ id: string; userId: string }>,
  res: Response
) {
  const ownerId = req.user!.id;
  const albumId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = req.body;

  const share = await updateAlbumShareService({
    userId: ownerId,
    albumId,
    targetUserId,
    role,
  });

  res.json(share);
}

export async function removeAlbumShare(
  req: Request<{ id: string; userId: string }>,
  res: Response
) {
  const ownerId = req.user!.id;
  const albumId = req.params.id;
  const targetUserId = req.params.userId;

  const result = await removeAlbumShareService({
    userId: ownerId,
    albumId,
    targetUserId,
  });

  res.json(result);
}