import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  startUpload,
  completeUpload,
  getPartUploadUrls,
  abortUpload,
  getUploadStatus,
  listActiveUploads
} from "./uploads.controller";
import {
  startUploadSchema,
  getPartUrlsSchema,
} from "./uploads.schema";

const router = Router();

router.post(
  "/",
  validate(startUploadSchema),
  asyncHandler(startUpload)
);

router.post(
  "/:id/complete",
  asyncHandler(completeUpload)
);

router.post(
  "/:id/part-urls",
  validate(getPartUrlsSchema),
  asyncHandler(getPartUploadUrls)
);

// abort multipart upload
router.delete(
  "/:id",
  asyncHandler(abortUpload)
);

// get upload status ( resume suppport )
router.get(
  "/:id/status",
  asyncHandler(getUploadStatus)
);

// list all active uploads
router.get(
  "/",
  asyncHandler(listActiveUploads)
);

export default router;