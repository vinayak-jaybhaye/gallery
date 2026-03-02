import { Request, Response } from "express";
import { handleGoogleAuth, handleCredentialsLogin } from "./auth.service";

export async function googleAuth(req: Request, res: Response) {
  const { idToken } = req.body;

  const { user, accessToken } = await handleGoogleAuth(idToken);
  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function credentialsLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  const { user, accessToken } = await handleCredentialsLogin(email, password);
  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function getMe(req: Request, res: Response) {
  res.json({ user: req.user });
}