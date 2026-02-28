import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import { AppError } from "@/middlewares/error.middleware";
import {
  GetObjectCommand,
  DeleteObjectsCommand
} from "@aws-sdk/client-s3";
import {
  getSignedUrl
} from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET!;
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// helper for delete media
async function deleteObjectsBatch(keys: string[]) {
  if (!keys.length) return;

  const command = new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: keys.map((Key) => ({ Key })),
      Quiet: true,
    },
  });

  await s3Client.send(command);
}


export async function listMediaService({
  userId,
  lastCreatedAt,
  limit = 20
}: {
  userId: string;
  lastCreatedAt?: Date;
  limit?: number;
}) {
  const take = Math.min(limit, 100);

  const items = await prisma.media.findMany({
    where: {
      ownerId: userId,
      status: {
        in: ["ready", "processing"]
      },
      ...(lastCreatedAt && {
        createdAt: { lt: lastCreatedAt }
      })
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" }
    ],
    take: take + 1
  });

  let nextCursor: string | null = null;

  if (items.length > take) {
    const nextItem = items.pop()!;
    nextCursor = nextItem.createdAt.toISOString();
  }

  // Generate signed URLs in parallel
  const itemsWithUrls = await Promise.all(
    items.map(async (item) => {
      let thumbnailUrl: string | null = null;

      if (item.thumbnailKey) {
        const command = new GetObjectCommand({
          Bucket: BUCKET,
          Key: item.thumbnailKey
        });

        thumbnailUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 5
        });
      }

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        createdAt: item.createdAt,
        takenAt: item.takenAt,
        width: item.width,
        height: item.height,
        durationSeconds: item.durationSeconds,
        thumbnailUrl
      };
    })
  );

  return {
    items: itemsWithUrls,
    nextCursor
  };
}

export async function getMediaByIdService({
  userId,
  mediaId
}: {
  userId: string;
  mediaId: string;
}) {
  const media = await prisma.media.findFirst({
    where: {
      id: mediaId,
      ownerId: userId,
      status: {
        in: ["ready", "processing"]
      }
    }
  });

  if (!media) {
    throw new AppError("Media not found", 404);
  }

  const mediaKey = media.masterKey ?? media.originalKey;

  const originalCommand = new GetObjectCommand({
    Bucket: BUCKET,
    Key: mediaKey
  });

  const originalUrl = await getSignedUrl(s3Client, originalCommand, {
    expiresIn: 60 * 5
  });

  let thumbnailUrl: string | null = null;

  if (media.thumbnailKey) {
    const thumbCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: media.thumbnailKey
    });

    thumbnailUrl = await getSignedUrl(s3Client, thumbCommand, {
      expiresIn: 60 * 5
    });
  }

  return {
    id: media.id,
    type: media.type,
    title: media.title,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    width: media.width,
    height: media.height,
    durationSeconds: media.durationSeconds,
    takenAt: media.takenAt,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    originalUrl,
    thumbnailUrl
  }
}

export async function updateMediaService({
  userId,
  mediaId,
  data
}: {
  userId: string;
  mediaId: string;
  data: {
    title?: string;
  }
}) {
  const media = await prisma.media.findFirst({
    where: {
      id: mediaId,
      ownerId: userId
    }
  });

  if (!media) {
    throw new AppError("Media not found", 404);
  }

  return prisma.media.update({
    where: { id: mediaId },
    data
  });
}

export async function deleteMediaService({
  userId,
  mediaIds,
}: {
  userId: string;
  mediaIds: string[];
}) {
  if (!mediaIds.length) {
    return { success: true };
  }

  const now = new Date();

  const result = await prisma.media.updateMany({
    where: {
      id: { in: mediaIds },
      ownerId: userId,
      status: "ready",
    },
    data: {
      status: "deleted",
      deletedAt: now,
    },
  });

  return {
    success: true,
    deletedCount: result.count,
  };
}

export async function listDeletedMediaService({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: { id: string };
  limit?: number;
}) {
  const take = Math.min(limit, 100);

  const items = await prisma.media.findMany({
    where: {
      ownerId: userId,
      status: "deleted",
    },
    orderBy: [
      { deletedAt: "desc" },
      { id: "desc" },
    ],
    cursor: cursor ? { id: cursor.id } : undefined,
    skip: cursor ? 1 : 0,
    take: take + 1,
  });

  let nextCursor: { id: string } | null = null;

  if (items.length > take) {
    const nextItem = items.pop()!;
    nextCursor = { id: nextItem.id };
  }

  // add thumbnail URLs
  const itemsWithUrls = await Promise.all(
    items.map(async (item) => {
      let thumbnailUrl: string | null = null;

      if (item.thumbnailKey) {
        const command = new GetObjectCommand({
          Bucket: BUCKET,
          Key: item.thumbnailKey
        });

        thumbnailUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 5
        });
      }

      return {
        id: item.id,
        type: item.type,
        durationSeconds: item.durationSeconds,
        title: item.title,
        sizeBytes: item.sizeBytes,
        expiresAt: new Date(item.deletedAt!.getTime() + TRASH_RETENTION_MS),
        thumbnailUrl
      };
    })
  );

  return {
    items: itemsWithUrls,
    nextCursor,
  };
}

export async function recoverMediaService({
  userId,
  mediaIds,
}: {
  userId: string;
  mediaIds: string[];
}) {
  if (!mediaIds.length) {
    return { success: true };
  }

  const now = new Date();

  const result = await prisma.media.updateMany({
    where: {
      id: { in: mediaIds },
      ownerId: userId,
      status: "deleted",
    },
    data: {
      status: "ready",
      deletedAt: null,
    },
  });

  return {
    success: true,
    recoveredCount: result.count,
  };
}

export async function emptyTrashService(userId: string) {
  const media = await prisma.media.findMany({
    where: {
      ownerId: userId,
      status: "deleted",
    },
  });

  if (!media.length) {
    return { success: true, deletedCount: 0 };
  }

  // Delete S3
  const keys: string[] = [];

  for (const item of media) {
    keys.push(item.originalKey);
    if (item.masterKey) keys.push(item.masterKey);
    if (item.thumbnailKey) keys.push(item.thumbnailKey);
  }

  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await deleteObjectsBatch(chunk);
  }

  const totalSize = media.reduce(
    (sum, item) => sum + item.sizeBytes!,
    BigInt(0)
  );

  // DB transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        storageUsedBytes: {
          decrement: totalSize,
        },
      },
    }),
    prisma.media.deleteMany({
      where: {
        ownerId: userId,
        status: "deleted",
      },
    }),
  ]);

  return {
    success: true,
    deletedCount: media.length,
  };
}

export async function deleteFromTrashService({
  userId,
  mediaIds,
}: {
  userId: string;
  mediaIds: string[];
}) {
  if (!mediaIds.length) {
    return { success: true, deletedCount: 0 };
  }

  const media = await prisma.media.findMany({
    where: {
      id: { in: mediaIds },
      ownerId: userId,
      status: "deleted",
    },
  });

  if (!media.length) {
    return { success: true, deletedCount: 0 };
  }

  // Delete S3 objects (safe / idempotent)
  const keys: string[] = [];

  for (const item of media) {
    keys.push(item.originalKey);
    if (item.masterKey) keys.push(item.masterKey);
    if (item.thumbnailKey) keys.push(item.thumbnailKey);
  }

  await deleteObjectsBatch(keys);

  // Calculate total storage to subtract
  const totalSize = media.reduce(
    (sum, item) => sum + item.sizeBytes!,
    BigInt(0)
  );

  // DB transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        storageUsedBytes: {
          decrement: totalSize,
        },
      },
    }),
    prisma.media.deleteMany({
      where: {
        id: { in: media.map((m) => m.id) },
      },
    }),
  ]);

  return {
    success: true,
    deletedCount: media.length,
  };
}