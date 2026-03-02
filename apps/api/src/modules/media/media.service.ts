import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import crypto from "crypto";
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
  limit = 20,
  type,
  albumId
}: {
  userId: string;
  lastCreatedAt?: Date;
  limit?: number;
  type?: "image" | "video";
  albumId?: string;
}) {
  // TODO:: add albums
  const take = Math.min(limit, 100);

  const items = await prisma.media.findMany({
    where: {
      ownerId: userId,
      status: {
        in: ["ready", "processing"]
      },
      ...(lastCreatedAt && {
        createdAt: { lt: lastCreatedAt }
      }),
      ...(type && { type })
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

// Media sharing services
export async function shareMediaService({
  userId,
  mediaId,
  email,
}: {
  userId: string;
  mediaId: string;
  email: string;
}) {
  return prisma.$transaction(async (tx) => {
    const media = await tx.media.findFirst({
      where: {
        id: mediaId,
        ownerId: userId,
        status: "ready",
      },
      select: { id: true },
    });

    if (!media) {
      throw new AppError("Media not found", 404);
    }

    const targetUser = await tx.user.findUnique({
      where: { email },
      select: { id: true, email: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUser.id === userId) {
      throw new AppError("Cannot share with yourself", 400);
    }

    await tx.mediaShare.upsert({
      where: {
        mediaId_userId: {
          mediaId,
          userId: targetUser.id,
        },
      },
      create: {
        mediaId,
        userId: targetUser.id,
      },
      update: {},
    });

    return targetUser;
  });
}

export async function removeMediaShareService({
  userId,
  mediaId,
  targetUserId,
}: {
  userId: string;
  mediaId: string;
  targetUserId: string;
}) {
  const result = await prisma.mediaShare.deleteMany({
    where: {
      mediaId,
      userId: targetUserId,
      media: {
        ownerId: userId,
      },
    },
  });

  if (result.count === 0) {
    throw new AppError("Share not found or insufficient permissions", 404);
  }

  return { success: true };
}

export async function revokePublicShareService({
  userId,
  shareIds,
}: {
  userId: string;
  shareIds: string[];
}) {
  if (!shareIds.length) {
    throw new AppError("No share IDs provided", 400);
  }

  const result = await prisma.publicShare.deleteMany({
    where: {
      id: { in: shareIds },
      media: {
        ownerId: userId,
      },
    },
  });

  if (result.count === 0) {
    throw new AppError("Public link not found", 404);
  }

  return {
    success: true,
    deletedCount: result.count,
  };
}

export async function createPublicShareService({
  userId,
  mediaId,
  expiresInDays,
}: {
  userId: string;
  mediaId: string;
  expiresInDays?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const media = await tx.media.findFirst({
      where: {
        id: mediaId,
        ownerId: userId,
      },
      select: {
        id: true,
        type: true,
        title: true,
      },
    });

    if (!media) {
      throw new AppError("Media not found", 404);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Ensure only one public link per media
    await tx.publicShare.deleteMany({
      where: { mediaId },
    });

    const share = await tx.publicShare.create({
      data: {
        mediaId,
        token,
        expiresAt,
      },
    });

    return {
      id: share.id,
      token: share.token,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      media,
    };
  });
}

export async function getPublicMediaByTokenService(token: string) {
  const share = await prisma.publicShare.findUnique({
    where: { token },
    include: { media: true },
  });

  if (!share) {
    throw new AppError("Invalid link", 404);
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new AppError("Link expired", 410);
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: share.media.masterKey ?? share.media.originalKey,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 5,
  });

  return {
    title: share.media.title,
    mimeType: share.media.mimeType,
    signedUrl,
    expiresAt: share.expiresAt,
  };
}

export async function listMediaSharedWithMeService({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const shares = await prisma.mediaShare.findMany({
    where: { userId },
    include: { media: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  let nextCursor: string | null = null;

  if (shares.length > limit) {
    const nextItem = shares.pop()!;
    nextCursor = nextItem.id;
  }

  const items = await Promise.all(
    shares.map(async (share) => {
      const item = share.media;

      let thumbnailUrl: string | null = null;

      if (item.thumbnailKey) {
        const command = new GetObjectCommand({
          Bucket: BUCKET,
          Key: item.thumbnailKey,
        });

        thumbnailUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 5,
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
        thumbnailUrl,
      };
    })
  );

  return {
    items,
    nextCursor,
  };
}

export async function listMediaSharedByMeService({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const mediaItems = await prisma.media.findMany({
    where: {
      ownerId: userId,
      status: "ready",
      mediaShares: {
        some: {},
      },
      ...(cursor && {
        createdAt: { lt: new Date(cursor) },
      }),
    },
    select: {
      id: true,
      type: true,
      title: true,
      createdAt: true,
      _count: {
        select: {
          mediaShares: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  let nextCursor: string | null = null;

  if (mediaItems.length > limit) {
    const nextItem = mediaItems.pop()!;
    nextCursor = nextItem.createdAt.toISOString();
  }

  return {
    items: mediaItems.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      createdAt: item.createdAt,
      shareCount: item._count.mediaShares,
    })),
    nextCursor,
  };
}

export async function listMyPublicLinksService({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const shares = await prisma.publicShare.findMany({
    where: {
      media: { ownerId: userId },
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      media: {
        select: {
          id: true,
          type: true,
          title: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  let nextCursor: string | null = null;

  if (shares.length > limit) {
    const nextItem = shares.pop()!;
    nextCursor = nextItem.createdAt.toISOString();
  }

  return {
    items: shares,
    nextCursor,
  };
}

export async function listMediaSharesService({
  userId,
  mediaId,
}: {
  userId: string;
  mediaId: string;
}) {
  const shares = await prisma.mediaShare.findMany({
    where: {
      mediaId,
      media: {
        ownerId: userId, // requester owns the media
      },
    },
    select: {
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return shares.map((share) => ({
    userId: share.user.id,
    email: share.user.email,
    avatarUrl: share.user.avatarUrl,
    sharedAt: share.createdAt,
  }));
}