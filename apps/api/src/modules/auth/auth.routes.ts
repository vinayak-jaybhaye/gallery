import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { googleAuthSchema } from "./auth.schema";
import { asyncHandler } from "@/utils/asyncHandler";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { googleAuth, getMe } from "./auth.controller";

const router = Router();

router.post(
  "/google",
  validate(googleAuthSchema),
  asyncHandler(googleAuth)
);

router.get(
  "/me",
  authMiddleware,
  asyncHandler(getMe)
);

export default router;