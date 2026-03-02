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
  createPublicShareSchema,
  revokePublicShareSchema,
  listSharedWithMeSchema,
  listSharedByMeSchema,
  listMyPublicLinksSchema,
  shareMediaSchema,
  removeMediaShareSchema,
  sharesByIdSchema
} from "./media.schema";

import {
  listMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  listDeletedMedia,
  recoverMedia,
  deleteFromTrash,
  emptyTrash,
  listMediaSharedWithMe,
  listMediaSharedByMe,
  listMyPublicLinks,
  shareMedia,
  removeMediaShare,
  createPublicShare,
  revokePublicShare,
  listMediaShares
} from "./media.controller";

const router = Router();

// list media shared with me
router.get(
  "/shared-with-me",
  validate(listSharedWithMeSchema),
  asyncHandler(listMediaSharedWithMe)
);

// list user's shared media
router.get(
  "/shared-by-me",
  validate(listSharedByMeSchema),
  asyncHandler(listMediaSharedByMe)
);

// list all public links
router.get(
  "/public-links",
  validate(listMyPublicLinksSchema),
  asyncHandler(listMyPublicLinks)
);

// share media with { email }
router.post(
  "/:mediaId/shares",
  validate(shareMediaSchema),
  asyncHandler(shareMedia)
);

// get list of users media is shared wth
router.get(
  "/:mediaId/shares",
  validate(sharesByIdSchema),
  asyncHandler(listMediaShares)
);

// unshare media for userId
router.delete(
  "/:mediaId/shares/:userId",
  validate(removeMediaShareSchema),
  asyncHandler(removeMediaShare)
);

// public link sharing
router.post(
  "/:mediaId/public-share",
  validate(createPublicShareSchema),
  asyncHandler(createPublicShare)
);

// delete public link using shareId
router.delete(
  "/public-share",
  validate(revokePublicShareSchema),
  asyncHandler(revokePublicShare)
);

router.get("/", validate(listMediaSchema), asyncHandler(listMedia));
router.delete("/", validate(deleteMediaSchema), asyncHandler(deleteMedia));

router.get("/trash", validate(listDeletedMediaSchema), asyncHandler(listDeletedMedia));
router.delete("/trash", validate(deleteMediaSchema), asyncHandler(deleteFromTrash));
router.delete("/trash/all", asyncHandler(emptyTrash));

router.post("/recover", validate(recoverMediaSchema), asyncHandler(recoverMedia));

router.get("/:id", validate(mediaByIdParamSchema), asyncHandler(getMediaById));
router.patch("/:id", validate(updateMediaSchema), asyncHandler(updateMedia));

export default router;