import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/middlewares/error.middleware"
import { error } from "console";

const BUCKET = process.env.S3_BUCKET_NAME!;

type AlbumRole = "viewer" | "editor";

interface CreateAlbumParams {
  userId: string;
  title: string;
  mediaIds?: string[];
}

export async function createAlbumService({
  userId,
  title,
  mediaIds,
}: CreateAlbumParams) {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new AppError("Album title is required", 400);
  }

  return prisma.$transaction(async (tx) => {
    let validatedMediaIds: string[] = [];
    let coverThumbnailKey: string | null = null;

    // Validate ownership strictly
    if (mediaIds && mediaIds.length > 0) {
      const media = await tx.media.findMany({
        where: {
          id: { in: mediaIds },
          ownerId: userId,
          status: "ready",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          thumbnailKey: true,
        },
      });

      if (media.length !== mediaIds.length) {
        throw new AppError("Invalid media selection", 400);
      }

      validatedMediaIds = media.map((m) => m.id);

      // Keep first media's thumbnailKey for cover
      coverThumbnailKey = media[0]?.thumbnailKey ?? null;
    }

    // Create album
    const album = await tx.album.create({
      data: {
        ownerId: userId,
        title: cleanTitle,
        coverMediaId:
          validatedMediaIds.length > 0 ? validatedMediaIds[0] : null,
      },
    });

    // Attach media
    if (validatedMediaIds.length > 0) {
      await tx.albumMedia.createMany({
        data: validatedMediaIds.map((mediaId) => ({
          albumId: album.id,
          mediaId,
        })),
      });
    }

    // Generate signed URL for cover
    let coverMediaUrl: string | null = null;

    if (coverThumbnailKey) {
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: coverThumbnailKey,
      });

      coverMediaUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 5,
      });
    }

    // Return DTO (same shape as listAlbumsService)
    return {
      id: album.id,
      title: album.title,
      createdAt: album.createdAt,
      count: validatedMediaIds.length,
      coverMediaUrl,
    };
  });
}

interface ListAlbumsParams {
  userId: string;
  lastCreatedAt?: Date;
  limit?: number;
}

export async function listAlbumsService({
  userId,
  lastCreatedAt,
  limit = 20,
}: ListAlbumsParams) {
  const albums = await prisma.album.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { shares: { some: { userId } } },
      ],
      ...(lastCreatedAt && {
        createdAt: { lt: lastCreatedAt },
      }),
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    select: {
      id: true,
      title: true,
      createdAt: true,
      coverMedia: {
        select: {
          thumbnailKey: true,
        },
      },
      _count: {
        select: { media: true },
      },
    },
  });

  let nextCursor: string | null = null;

  if (albums.length > limit) {
    const nextItem = albums.pop()!;
    nextCursor = nextItem.createdAt.toISOString();
  }

  // Generate signed URLs for cover thumbnails
  const items = await Promise.all(
    albums.map(async (album) => {
      let coverMediaUrl: string | null = null;

      if (album.coverMedia?.thumbnailKey) {
        const command = new GetObjectCommand({
          Bucket: BUCKET,
          Key: album.coverMedia.thumbnailKey,
        });

        coverMediaUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 5,
        });
      }

      return {
        id: album.id,
        title: album.title,
        createdAt: album.createdAt,
        count: album._count.media,
        coverMediaUrl,
      };
    })
  );

  return {
    items,
    nextCursor,
  };
}
interface GetAlbumByIdParams {
  userId: string;
  albumId: string;
}

export async function getAlbumByIdService({
  userId,
  albumId,
}: GetAlbumByIdParams) {
  const album = await prisma.album.findFirst({
    where: {
      id: albumId,
      OR: [
        { ownerId: userId },
        { shares: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      ownerId: true,
      createdAt: true,
      coverMedia: {
        select: {
          thumbnailKey: true,
        },
      },
      _count: {
        select: { media: true },
      },
      shares: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!album) {
    throw new AppError("Album not found", 404);
  }

  // Determine role
  const isOwner = album.ownerId === userId;

  const shareRecord = album.shares.find(
    (s) => s.user.id === userId
  );

  const userRole = isOwner ? "owner" : shareRecord?.role ?? null;

  // Generate signed cover URL
  let coverMediaUrl: string | null = null;

  if (album.coverMedia?.thumbnailKey) {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: album.coverMedia.thumbnailKey,
    });

    coverMediaUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5,
    });
  }

  return {
    id: album.id,
    title: album.title,
    createdAt: album.createdAt,
    count: album._count.media,
    coverMediaUrl,
    isOwner,
    userRole,
    members: [
      {
        id: album.ownerId,
        role: "owner",
      },
      ...album.shares.map((share) => ({
        id: share.user.id,
        email: share.user.email,
        avatarUrl: share.user.avatarUrl,
        role: share.role,
      })),
    ],
  };
}
interface UpdateAlbumParams {
  userId: string;
  albumId: string;
  data: {
    title?: string;
    coverMediaId?: string | null;
  };
}

export async function updateAlbumService({
  userId,
  albumId,
  data,
}: UpdateAlbumParams) {
  return prisma.$transaction(async (tx) => {
    // Check ownership or editor role
    const album = await tx.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { ownerId: userId },
          { shares: { some: { userId, role: "editor" } } },
        ],
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!album) {
      throw new AppError("Album not found or insufficient permissions", 404);
    }

    // If coverMediaId is provided → validate it belongs to album
    if (data.coverMediaId !== undefined) {
      if (data.coverMediaId !== null) {
        const exists = await tx.albumMedia.findUnique({
          where: {
            albumId_mediaId: {
              albumId,
              mediaId: data.coverMediaId,
            },
          },
        });

        if (!exists) {
          throw new Error("Cover media must belong to the album");
        }
      }
    }

    // Update album
    const updated = await tx.album.update({
      where: { id: albumId },
      data: {
        ...(data.title !== undefined && {
          title: data.title.trim(),
        }),
        ...(data.coverMediaId !== undefined && {
          coverMediaId: data.coverMediaId,
        }),
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        coverMedia: {
          select: {
            thumbnailKey: true,
          },
        },
        _count: {
          select: { media: true },
        },
      },
    });

    // Generate signed cover URL
    let coverMediaUrl: string | null = null;

    if (updated.coverMedia?.thumbnailKey) {
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: updated.coverMedia.thumbnailKey,
      });

      coverMediaUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 5,
      });
    }

    // Return DTO (consistent with others)
    return {
      id: updated.id,
      title: updated.title,
      createdAt: updated.createdAt,
      count: updated._count.media,
      coverMediaUrl,
    };
  });
}

interface DeleteAlbumParams {
  userId: string;
  albumId: string;
}

export async function deleteAlbumService({
  userId,
  albumId,
}: DeleteAlbumParams) {
  // Only owner can delete
  const deleted = await prisma.album.deleteMany({
    where: {
      id: albumId,
      ownerId: userId,
    },
  });

  if (deleted.count === 0) {
    throw new AppError("Album not found or insufficient permissions", 404);
  }

  // onDeleteCascade will handle deleting rows from MediaAlbum and AlbumShare tables

  return { success: true };
}

interface AddMediaToAlbumParams {
  userId: string;
  albumId: string;
  mediaIds: string[];
}

export async function addMediaToAlbumService({
  userId,
  albumId,
  mediaIds,
}: AddMediaToAlbumParams) {
  if (!mediaIds.length) {
    throw new AppError("No media provided", 400);
  }
  return prisma.$transaction(async (tx) => {
    // Check album access
    const album = await tx.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { ownerId: userId },
          { shares: { some: { userId, role: "editor" } } },
        ],
      },
      select: { id: true },
    });

    if (!album) {
      throw new AppError("Album not found or insufficient permissions", 404);
    }

    // Verify user owns media
    const validMedia = await tx.media.findMany({
      where: {
        id: { in: mediaIds },
        ownerId: userId,
        status: "ready",
      },
      select: { id: true },
    });

    if (validMedia.length !== mediaIds.length) {
      throw new AppError("Some media not found or not accessible", 400);
    }

    // Check current album media count
    const existingCount = await tx.albumMedia.count({
      where: { albumId },
    });

    // Add media (skip duplicates)
    await tx.albumMedia.createMany({
      data: validMedia.map((m) => ({
        albumId,
        mediaId: m.id,
      })),
      skipDuplicates: true,
    });

    // If album previously empty → set cover
    if (existingCount === 0 && validMedia.length > 0) {
      await tx.album.update({
        where: { id: albumId },
        data: {
          coverMediaId: validMedia[0].id,
        },
      });
    }

    return {
      success: true,
      addedCount: validMedia.length,
    };
  });
}

interface RemoveMediaFromAlbumParams {
  userId: string;
  albumId: string;
  mediaIds: string[];
}

export async function removeMediaFromAlbumService({
  userId,
  albumId,
  mediaIds,
}: RemoveMediaFromAlbumParams) {
  if (!mediaIds.length) {
    throw new AppError("No media provided", 400);
  }

  return prisma.$transaction(async (tx) => {
    // Check permission
    const album = await tx.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { ownerId: userId },
          { shares: { some: { userId, role: "editor" } } },
        ],
      },
      select: {
        id: true,
        coverMediaId: true,
      },
    });

    if (!album) {
      throw new AppError(
        "Album not found or insufficient permissions",
        404
      );
    }

    // Remove media from album
    const result = await tx.albumMedia.deleteMany({
      where: {
        albumId,
        mediaId: { in: mediaIds },
      },
    });

    // If current cover was removed → fix it
    if (
      album.coverMediaId &&
      mediaIds.includes(album.coverMediaId)
    ) {
      // Find next available media in album
      const nextMedia = await tx.albumMedia.findFirst({
        where: { albumId },
        orderBy: { addedAt: "asc" }, // or createdAt desc if you prefer
        select: { mediaId: true },
      });

      await tx.album.update({
        where: { id: albumId },
        data: {
          coverMediaId: nextMedia?.mediaId ?? null,
        },
      });
    }

    return {
      success: true,
      removedCount: result.count,
    };
  });
}

interface ShareAlbumParams {
  userId: string;
  albumId: string;
  targetUserId: string;
  role: AlbumRole;
}

export async function shareAlbumService({
  userId,
  albumId,
  targetUserId,
  role,
}: ShareAlbumParams) {
  if (targetUserId === userId) {
    throw new AppError("Cannot share album with yourself", 400);
  }

  return prisma.$transaction(async (tx) => {
    // Ensure album exists and user is owner
    const album = await tx.album.findFirst({
      where: {
        id: albumId,
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!album) {
      throw new AppError(
        "Album not found or insufficient permissions",
        404
      );
    }

    // Ensure target user exists
    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    // Upsert share
    const share = await tx.albumShare.upsert({
      where: {
        albumId_userId: {
          albumId,
          userId: targetUserId,
        },
      },
      create: {
        albumId,
        userId: targetUserId,
        role,
      },
      update: { role },
    });

    // Return clean DTO
    return {
      id: targetUser.id,
      email: targetUser.email,
      avatarUrl: targetUser.avatarUrl,
      role: share.role,
    };
  });
}

interface UpdateAlbumShareParams {
  userId: string;
  albumId: string;
  targetUserId: string;
  role: AlbumRole;
}

export async function updateAlbumShareService({
  userId,
  albumId,
  targetUserId,
  role,
}: UpdateAlbumShareParams) {
  // Ensure requester is album owner
  const album = await prisma.album.findFirst({
    where: {
      id: albumId,
      ownerId: userId,
    },
    select: { id: true },
  });

  if (!album) {
    throw new AppError(
      "Album not found or insufficient permissions",
      404
    );
  }

  // Prevent updating yourself (owner isn't in AlbumShare anyway)
  if (targetUserId === userId) {
    throw new AppError("Cannot modify owner role", 400);
  }

  // Update share using composite unique key
  const updated = await prisma.albumShare.update({
    where: {
      albumId_userId: {
        albumId,
        userId: targetUserId,
      },
    },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    id: updated.user.id,
    email: updated.user.email,
    avatarUrl: updated.user.avatarUrl,
    role: updated.role,
  };
}

interface RemoveAlbumShareParams {
  userId: string;
  albumId: string;
  targetUserId: string;
}

export async function removeAlbumShareService({
  userId,
  albumId,
  targetUserId,
}: RemoveAlbumShareParams) {
  return prisma.$transaction(async (tx) => {
    // Ensure requester is owner
    const album = await tx.album.findFirst({
      where: {
        id: albumId,
        ownerId: userId,
      },
      select: {
        id: true,
        coverMediaId: true,
      },
    });

    if (!album) {
      throw new AppError(
        "Album not found or insufficient permissions",
        404
      );
    }

    // Prevent removing owner
    if (targetUserId === userId) {
      throw new AppError("Cannot remove album owner", 400);
    }

    // Ensure share exists
    const share = await tx.albumShare.findUnique({
      where: {
        albumId_userId: {
          albumId,
          userId: targetUserId,
        },
      },
    });

    if (!share) {
      throw new AppError("Share not found", 404);
    }

    // Remove user's media from album
    const userMediaInAlbum = await tx.albumMedia.findMany({
      where: {
        albumId,
        media: {
          ownerId: targetUserId,
        },
      },
      select: { mediaId: true },
    });

    await tx.albumMedia.deleteMany({
      where: {
        albumId,
        media: {
          ownerId: targetUserId,
        },
      },
    });

    // If cover was removed fix it
    if (
      album.coverMediaId &&
      userMediaInAlbum.some(
        (m) => m.mediaId === album.coverMediaId
      )
    ) {
      const nextMedia = await tx.albumMedia.findFirst({
        where: { albumId },
        orderBy: { addedAt: "asc" },
        select: { mediaId: true },
      });

      await tx.album.update({
        where: { id: albumId },
        data: {
          coverMediaId: nextMedia?.mediaId ?? null,
        },
      });
    }

    // Delete share
    await tx.albumShare.delete({
      where: {
        albumId_userId: {
          albumId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  });
}