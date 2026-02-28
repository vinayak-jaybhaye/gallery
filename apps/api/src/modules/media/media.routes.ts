import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  listMediaSchema,
  listDeletedMediaSchema,
  mediaByIdParamSchema,
  updateMediaSchema,
  deleteMediaSchema,
  recoverMediaSchema,
} from "./media.schema";

import {
  listMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  listDeletedMedia,
  recoverMedia,
  deleteFromTrash,
  emptyTrash
} from "./media.controller";

const router = Router();
router.get("/", validate(listMediaSchema), asyncHandler(listMedia));
router.delete("/", validate(deleteMediaSchema), asyncHandler(deleteMedia));

router.get("/trash", validate(listDeletedMediaSchema), asyncHandler(listDeletedMedia));
router.delete("/trash", validate(deleteMediaSchema), asyncHandler(deleteFromTrash));
router.delete("/trash/all", asyncHandler(emptyTrash));

router.post("/recover", validate(recoverMediaSchema), asyncHandler(recoverMedia));

router.get("/:id", validate(mediaByIdParamSchema), asyncHandler(getMediaById));
router.patch("/:id", validate(updateMediaSchema), asyncHandler(updateMedia));


export default router;