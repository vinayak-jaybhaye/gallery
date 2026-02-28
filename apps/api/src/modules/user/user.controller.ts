import {
  updatePasswordAuthStateService,
  getAccountInfoService
} from "./user.service";
import { AppError } from "@/middlewares/error.middleware";

export async function getAccountInfo(req: any, res: any) {
  try {
    const accountInfo = await getAccountInfoService(req.user.id);
    res.json(accountInfo);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to retrieve account info" });
    }
  }
}

export async function updatePasswordAuthState(req: any, res: any) {
  if (req.body.passwordAuthEnabled && !req.body.password) {
    throw new AppError("Password is required when enabling password authentication", 400);
  }
  if (req.body.password && req.body.password.length < 6) {
    throw new AppError("Password must be at least 6 characters long", 400);
  }
  const updated = await updatePasswordAuthStateService(
    {
      userId: req.user.id,
      passwordAuthEnabled: req.body.passwordAuthEnabled,
      password: req.body.password,
    }
  );

  res.json(updated);
}