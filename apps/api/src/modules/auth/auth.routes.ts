import { Router } from "express";
import { validate } from "@/middlewares/validate.middleware";
import { googleAuthSchema, credentialsLoginSchema } from "./auth.schema";
import { asyncHandler } from "@/utils/asyncHandler";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { googleAuth, getMe, credentialsLogin } from "./auth.controller";

const router = Router();

router.post(
  "/google",
  validate(googleAuthSchema),
  asyncHandler(googleAuth)
);

router.post(
  "/credentials-login",
  validate(credentialsLoginSchema),
  asyncHandler(credentialsLogin)
)

router.get(
  "/me",
  authMiddleware,
  asyncHandler(getMe)
);

export default router;