import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  createAlbumRequestSchema,
  listAlbumsQuerySchema,
  albumIdParamsSchema,
  updateAlbumRequestSchema,
  addAlbumMediaRequestSchema,
  removeAlbumMediaRequestSchema,
  listAlbumSharesRequestSchema,
  createAlbumShareRequestSchema,
  updateAlbumShareRequestSchema,
  removeAlbumShareRequestSchema,
  leaveAlbumRequestSchema,
} from "./albums.schema";
import {
  createAlbumHandler,
  listAlbumsHandler,
  getAlbumByIdHandler,
  updateAlbumHandler,
  deleteAlbumHandler,
  addMediaToAlbumHandler,
  removeMediaFromAlbumHandler,
  listAlbumSharesHandler,
  shareAlbumHandler,
  updateAlbumShareHandler,
  removeAlbumShareHandler,
  leaveAlbumHandler,
} from "./albums.controller";

const router = Router();

const ALBUM_COLLECTION_PATH = "/";
const ALBUM_ITEM_PATH = "/:albumId";
const ALBUM_MEDIA_PATH = "/:albumId/media";
const ALBUM_SHARES_PATH = "/:albumId/shares";
const ALBUM_SHARE_MEMBER_PATH = "/:albumId/shares/:targetUserId";
const ALBUM_LEAVE_PATH = "/:albumId/leave";

// Album CRUD
router.post(ALBUM_COLLECTION_PATH, validate(createAlbumRequestSchema), asyncHandler(createAlbumHandler));
router.get(ALBUM_COLLECTION_PATH, validate(listAlbumsQuerySchema), asyncHandler(listAlbumsHandler));
router.get(ALBUM_ITEM_PATH, validate(albumIdParamsSchema), asyncHandler(getAlbumByIdHandler));
router.patch(ALBUM_ITEM_PATH, validate(updateAlbumRequestSchema), asyncHandler(updateAlbumHandler));
router.delete(ALBUM_ITEM_PATH, validate(albumIdParamsSchema), asyncHandler(deleteAlbumHandler));

// Album media management
router.post(ALBUM_MEDIA_PATH, validate(addAlbumMediaRequestSchema), asyncHandler(addMediaToAlbumHandler));
router.delete(ALBUM_MEDIA_PATH, validate(removeAlbumMediaRequestSchema), asyncHandler(removeMediaFromAlbumHandler));

// Album sharing
router.get(ALBUM_SHARES_PATH, validate(listAlbumSharesRequestSchema), asyncHandler(listAlbumSharesHandler));
router.post(ALBUM_SHARES_PATH, validate(createAlbumShareRequestSchema), asyncHandler(shareAlbumHandler));
router.patch(ALBUM_SHARE_MEMBER_PATH, validate(updateAlbumShareRequestSchema), asyncHandler(updateAlbumShareHandler));
router.delete(ALBUM_SHARE_MEMBER_PATH, validate(removeAlbumShareRequestSchema), asyncHandler(removeAlbumShareHandler));
router.post(ALBUM_LEAVE_PATH, validate(leaveAlbumRequestSchema), asyncHandler(leaveAlbumHandler));

export default router;