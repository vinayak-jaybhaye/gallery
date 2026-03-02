import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  createAlbumSchema,
  listAlbumsSchema,
  albumByIdParamSchema,
  updateAlbumSchema,
  addMediaToAlbumSchema,
  removeMediaFromAlbumSchema,
  shareAlbumSchema,
  updateAlbumShareSchema,
  removeAlbumShareSchema,
} from "./albums.schema";
import {
  createAlbum,
  listAlbums,
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  addMediaToAlbum,
  removeMediaFromAlbum,
  shareAlbum,
  updateAlbumShare,
  removeAlbumShare,
} from "./albums.controller";

const router = Router();

// Album CRUD
router.post("/", validate(createAlbumSchema), asyncHandler(createAlbum));
router.get("/", validate(listAlbumsSchema), asyncHandler(listAlbums));
router.get("/:id", validate(albumByIdParamSchema), asyncHandler(getAlbumById));
router.patch("/:id", validate(updateAlbumSchema), asyncHandler(updateAlbum));
router.delete("/:id", validate(albumByIdParamSchema), asyncHandler(deleteAlbum));

// Album media management
router.post("/:id/media", validate(addMediaToAlbumSchema), asyncHandler(addMediaToAlbum));
router.delete("/:id/media", validate(removeMediaFromAlbumSchema), asyncHandler(removeMediaFromAlbum));

// Album sharing
router.post("/:id/shares", validate(shareAlbumSchema), asyncHandler(shareAlbum));

router.patch(
  "/:id/shares/:userId",
  validate(updateAlbumShareSchema),
  asyncHandler(updateAlbumShare)
);

router.delete(
  "/:id/shares/:userId",
  validate(removeAlbumShareSchema),
  asyncHandler(removeAlbumShare)
);

export default router;