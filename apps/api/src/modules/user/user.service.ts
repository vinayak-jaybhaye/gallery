import { prisma } from "@/lib/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { encryptPassword } from "@/utils/password";

export async function updatePasswordAuthStateService({
  userId,
  passwordAuthEnabled,
  password,
}: {
  userId: string;
  passwordAuthEnabled: boolean;
  password?: string;
}) {
  if (!passwordAuthEnabled) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordAuthEnabled: false,
        passwordHash: null,
      },
    });

    return { success: true };
  }

  if (!password || password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400);
  }

  const passwordHash = await encryptPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordAuthEnabled: true,
      passwordHash,
    },
  });

  return { success: true };
}

export async function getAccountInfoService(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      email: true,
      passwordAuthEnabled: true,
      storageUsedBytes: true,
      storageQuotaBytes: true,
      avatarUrl: true,
    }
  });
}