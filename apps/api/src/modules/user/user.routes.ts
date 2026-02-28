import { Router } from "express";
import {
  getAccountInfo,
  updatePasswordAuthState
} from "./user.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", getAccountInfo);
router.post("/update-password-auth-state", asyncHandler(updatePasswordAuthState));

export default router;