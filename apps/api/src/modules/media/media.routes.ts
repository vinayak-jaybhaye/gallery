import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  listMediaLibraryQuerySchema,
  listMediaTrashQuerySchema,
  mediaIdParamsSchema,
  updateMediaDetailsRequestSchema,
  moveMediaToTrashRequestSchema,
  restoreMediaFromTrashRequestSchema,
  createPublicMediaLinkRequestSchema,
  revokePublicMediaLinksRequestSchema,
  listReceivedMediaQuerySchema,
  listSentMediaQuerySchema,
  listOwnedPublicLinksQuerySchema,
  createMediaShareRequestSchema,
  deleteMediaShareRequestSchema,
  listMediaShareRecipientsRequestSchema,
  listMediaPublicLinksRequestSchema
} from "./media.schema";

import {
  listMediaLibraryHandler,
  getMediaDetailsHandler,
  updateMediaDetailsHandler,
  moveMediaToTrashHandler,
  listMediaTrashHandler,
  restoreMediaFromTrashHandler,
  permanentlyDeleteMediaFromTrashHandler,
  emptyMediaTrashHandler,
  listReceivedMediaHandler,
  listSentMediaHandler,
  listOwnedPublicLinksHandler,
  createMediaShareHandler,
  deleteMediaShareHandler,
  createPublicMediaLinkHandler,
  revokePublicMediaLinksHandler,
  listMediaShareRecipientsHandler,
  listMediaPublicLinksHandler
} from "./media.controller";

const router = Router();

const MEDIA_COLLECTION_PATH = "/";
const MEDIA_ITEM_PATH = "/:mediaId";
const MEDIA_TRASH_PATH = "/trash";
const MEDIA_TRASH_ALL_PATH = "/trash/all";
const MEDIA_TRASH_RESTORE_PATH = "/trash/restore";
const RECEIVED_SHARES_PATH = "/shares/received";
const SENT_SHARES_PATH = "/shares/sent";
const OWNED_PUBLIC_LINKS_PATH = "/shares/public";
const MEDIA_SHARES_PATH = "/:mediaId/shares";
const MEDIA_SHARE_MEMBER_PATH = "/:mediaId/shares/:targetUserId";
const MEDIA_PUBLIC_LINKS_PATH = "/:mediaId/shares/public";

// Sharing and public links
router.get(
  RECEIVED_SHARES_PATH,
  validate(listReceivedMediaQuerySchema),
  asyncHandler(listReceivedMediaHandler)
);

router.get(
  SENT_SHARES_PATH,
  validate(listSentMediaQuerySchema),
  asyncHandler(listSentMediaHandler)
);

router.get(
  OWNED_PUBLIC_LINKS_PATH,
  validate(listOwnedPublicLinksQuerySchema),
  asyncHandler(listOwnedPublicLinksHandler)
);

router.get(
  MEDIA_PUBLIC_LINKS_PATH,
  validate(listMediaPublicLinksRequestSchema),
  asyncHandler(listMediaPublicLinksHandler)
);

router.post(
  MEDIA_SHARES_PATH,
  validate(createMediaShareRequestSchema),
  asyncHandler(createMediaShareHandler)
);

router.get(
  MEDIA_SHARES_PATH,
  validate(listMediaShareRecipientsRequestSchema),
  asyncHandler(listMediaShareRecipientsHandler)
);

router.delete(
  MEDIA_SHARE_MEMBER_PATH,
  validate(deleteMediaShareRequestSchema),
  asyncHandler(deleteMediaShareHandler)
);

router.post(
  MEDIA_PUBLIC_LINKS_PATH,
  validate(createPublicMediaLinkRequestSchema),
  asyncHandler(createPublicMediaLinkHandler)
);

router.delete(
  OWNED_PUBLIC_LINKS_PATH,
  validate(revokePublicMediaLinksRequestSchema),
  asyncHandler(revokePublicMediaLinksHandler)
);

// Media library and trash management
router.get(
  MEDIA_COLLECTION_PATH,
  validate(listMediaLibraryQuerySchema),
  asyncHandler(listMediaLibraryHandler)
);

router.delete(
  MEDIA_COLLECTION_PATH,
  validate(moveMediaToTrashRequestSchema),
  asyncHandler(moveMediaToTrashHandler)
);

router.get(
  MEDIA_TRASH_PATH,
  validate(listMediaTrashQuerySchema),
  asyncHandler(listMediaTrashHandler)
);

router.delete(
  MEDIA_TRASH_PATH,
  validate(moveMediaToTrashRequestSchema),
  asyncHandler(permanentlyDeleteMediaFromTrashHandler)
);

router.delete(
  MEDIA_TRASH_ALL_PATH,
  asyncHandler(emptyMediaTrashHandler)
);

router.post(
  MEDIA_TRASH_RESTORE_PATH,
  validate(restoreMediaFromTrashRequestSchema),
  asyncHandler(restoreMediaFromTrashHandler)
);

router.get(
  MEDIA_ITEM_PATH,
  validate(mediaIdParamsSchema),
  asyncHandler(getMediaDetailsHandler)
);

router.patch(
  MEDIA_ITEM_PATH,
  validate(updateMediaDetailsRequestSchema),
  asyncHandler(updateMediaDetailsHandler)
);

export default router;