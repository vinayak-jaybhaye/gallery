import { Request, Response } from "express";
import {
  createAlbumService,
  listAccessibleAlbumsService,
  getAccessibleAlbumByIdService,
  updateAlbumDetailsService,
  deleteOwnedAlbumService,
  addMediaToAlbumService,
  removeMediaFromAlbumService,
  listAlbumCollaboratorsService,
  shareAlbumWithUserService,
  updateAlbumCollaboratorRoleService,
  removeAlbumCollaboratorService,
  leaveSharedAlbumService,
} from "./albums.service";
import { decodeTimeIdCursor } from "@/utils/paginationCursor";

export async function createAlbumHandler(req: Request, res: Response) {
  const userId = req.user!.id;
  const { title, mediaIds } = req.body;

  const album = await createAlbumService({
    userId,
    title,
    mediaIds,
  });

  res.status(201).json(album);
}

export async function listAlbumsHandler(req: Request, res: Response) {
  const userId = req.user!.id;

  const { cursor, limit } = req.query as {
    cursor?: string;
    limit?: string | number;
  };

  const result = await listAccessibleAlbumsService({
    userId,
    cursor: cursor ? decodeTimeIdCursor(cursor) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
  });

  res.json(result);
}

export async function getAlbumByIdHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;

  const album = await getAccessibleAlbumByIdService({
    userId,
    albumId,
  });

  res.json(album);
}

export async function updateAlbumHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;

  const updated = await updateAlbumDetailsService({
    userId,
    albumId,
    data: req.body,
  });

  res.json(updated);
}

export async function deleteAlbumHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;

  const result = await deleteOwnedAlbumService({
    userId,
    albumId,
  });

  res.json(result);
}

export async function addMediaToAlbumHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;
  const { mediaIds } = req.body;

  const result = await addMediaToAlbumService({
    userId,
    albumId,
    mediaIds,
  });

  res.json(result);
}

export async function removeMediaFromAlbumHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;
  const { mediaIds } = req.body;

  const result = await removeMediaFromAlbumService({
    userId,
    albumId,
    mediaIds,
  });

  res.json(result);
}

export async function shareAlbumHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;
  const { email, role } = req.body;

  const share = await shareAlbumWithUserService({
    userId,
    albumId,
    email,
    role,
  });

  res.status(201).json(share);
}

export async function listAlbumSharesHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const userId = req.user!.id;
  const albumId = req.params.albumId;

  const result = await listAlbumCollaboratorsService({
    userId,
    albumId,
  });

  res.json(result);
}

export async function updateAlbumShareHandler(
  req: Request<{ albumId: string; targetUserId: string }>,
  res: Response
) {
  const ownerId = req.user!.id;
  const albumId = req.params.albumId;
  const targetUserId = req.params.targetUserId;
  const { role } = req.body;

  const share = await updateAlbumCollaboratorRoleService({
    userId: ownerId,
    albumId,
    targetUserId,
    role,
  });

  res.json(share);
}

export async function removeAlbumShareHandler(
  req: Request<{ albumId: string; targetUserId: string }>,
  res: Response
) {
  const ownerId = req.user!.id;
  const albumId = req.params.albumId;
  const targetUserId = req.params.targetUserId;

  const result = await removeAlbumCollaboratorService({
    userId: ownerId,
    albumId,
    targetUserId,
  });

  res.json(result);
}

export async function leaveAlbumHandler(
  req: Request<{ albumId: string }>,
  res: Response
) {
  const albumId = req.params.albumId;
  const userId = req.user!.id;

  const result = await leaveSharedAlbumService({
    userId,
    albumId,
  });

  res.json(result);
}
