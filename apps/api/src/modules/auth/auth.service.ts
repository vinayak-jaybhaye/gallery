import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function handleGoogleAuth(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token");
  }

  const { email, picture } = payload;

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      avatarUrl: picture,
    },
    create: {
      email,
      avatarUrl: picture,
    },
  });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, avatarUrl: user.avatarUrl },
    jwtSecret,
    {
      expiresIn: (process.env.JWT_EXPIRY ?? "1d") as jwt.SignOptions["expiresIn"],
    }
  );
  return { user, accessToken: token };
}