import { Prisma, prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/middlewares/error.middleware"
import { encodeTimeIdCursor, TimeIdCursor } from "@/utils/paginationCursor";

const BUCKET = process.env.S3_BUCKET!;

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

    // Return DTO (same shape as listAccessibleAlbumsService)
    return {
      id: album.id,
      title: album.title,
      createdAt: album.createdAt,
      count: validatedMediaIds.length,
      coverMediaUrl,
    };
  });
}

interface ListAccessibleAlbumsParams {
  userId: string;
  cursor?: TimeIdCursor;
  limit?: number;
}

export async function listAccessibleAlbumsService({
  userId,
  cursor,
  limit = 20,
}: ListAccessibleAlbumsParams) {
  const albums = await prisma.album.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { shares: { some: { userId } } },
      ],
      ...(cursor && {
        AND: [
          {
            OR: [
              { createdAt: { lt: cursor.time } },
              { createdAt: cursor.time, id: { lt: cursor.id } },
            ],
          },
        ],
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
      ownerId: true,
      coverMedia: {
        select: {
          thumbnailKey: true,
        },
      },
      _count: {
        select: { media: true },
      },
      shares: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  let nextCursor: string | null = null;

  if (albums.length > limit) {
    const nextItem = albums.pop()!;
    nextCursor = encodeTimeIdCursor({
      time: nextItem.createdAt,
      id: nextItem.id,
    });
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
        ownerId: album.ownerId,
        userRole:
          album.ownerId === userId
            ? "owner"
            : album.shares[0]?.role ?? null,
      };
    })
  );

  return {
    items,
    nextCursor,
  };
}

interface GetAccessibleAlbumByIdParams {
  userId: string;
  albumId: string;
}

export async function getAccessibleAlbumByIdService({
  userId,
  albumId,
}: GetAccessibleAlbumByIdParams) {
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
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!album) {
    throw new AppError("Album not found", 404);
  }

  const isOwner = album.ownerId === userId;

  const userRole = isOwner
    ? "owner"
    : album.shares[0]?.role ?? null;

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
    ownerId: album.ownerId,
    userRole,
  };
}

interface UpdateAlbumDetailsParams {
  userId: string;
  albumId: string;
  data: {
    title?: string;
    coverMediaId?: string | null;
  };
}

export async function updateAlbumDetailsService({
  userId,
  albumId,
  data,
}: UpdateAlbumDetailsParams) {
  return prisma.$transaction(async (tx) => {
    // Permission check
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

    // Validate cover media if provided
    if (data.coverMediaId !== undefined && data.coverMediaId !== null) {
      const exists = await tx.albumMedia.findUnique({
        where: {
          albumId_mediaId: {
            albumId,
            mediaId: data.coverMediaId,
          },
        },
      });

      if (!exists) {
        throw new AppError("Cover media must belong to the album", 400);
      }
    }

    const updateData: Prisma.AlbumUpdateInput = {};

    if (data.title !== undefined) {
      if (data.title === null) {
        throw new AppError("Title cannot be null", 400);
      }

      updateData.title = data.title.trim();
    }

    if (data.coverMediaId !== undefined) {
      updateData.coverMedia =
        data.coverMediaId === null
          ? { disconnect: true }
          : { connect: { id: data.coverMediaId } };
    }

    await tx.album.update({
      where: { id: albumId },
      data: updateData,
    });

    return { success: true };
  });
}

interface DeleteOwnedAlbumParams {
  userId: string;
  albumId: string;
}

export async function deleteOwnedAlbumService({
  userId,
  albumId,
}: DeleteOwnedAlbumParams) {
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
        status: { in: ["ready", "processing"] },
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

interface ShareAlbumWithUserParams {
  userId: string;
  albumId: string;
  email: string;
  role: AlbumRole;
}

interface ListAlbumCollaboratorsParams {
  userId: string;
  albumId: string;
}

export async function listAlbumCollaboratorsService({
  userId,
  albumId,
}: ListAlbumCollaboratorsParams) {
  const album = await prisma.album.findFirst({
    where: {
      id: albumId,
      OR: [
        { ownerId: userId },
        { shares: { some: { userId } } },
      ],
    },
    select: {
      owner: {
        select: {
          id: true,
          email: true,
          avatarUrl: true,
        },
      },
      shares: {
        orderBy: { createdAt: "asc" },
        select: {
          userId: true,
          role: true,
          createdAt: true,
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
    throw new AppError("Album not found or insufficient permissions", 404);
  }

  return {
    items: [
      {
        userId: album.owner.id,
        role: "owner" as const,
        createdAt: null,
        user: album.owner,
      },
      ...album.shares.map((share) => ({
        userId: share.userId,
        role: share.role,
        createdAt: share.createdAt,
        user: share.user,
      })),
    ],
  };
}

export async function shareAlbumWithUserService({
  userId,
  albumId,
  email,
  role,
}: ShareAlbumWithUserParams) {
  const targetEmail = email.trim().toLowerCase();

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
      where: { email: targetEmail },
      select: { id: true, email: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUser.id === userId) {
      throw new AppError("Cannot share album with yourself", 400);
    }

    // Upsert share
    const share = await tx.albumShare.upsert({
      where: {
        albumId_userId: {
          albumId,
          userId: targetUser.id,
        },
      },
      create: {
        albumId,
        userId: targetUser.id,
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

interface UpdateAlbumCollaboratorRoleParams {
  userId: string;
  albumId: string;
  targetUserId: string;
  role: AlbumRole;
}

export async function updateAlbumCollaboratorRoleService({
  userId,
  albumId,
  targetUserId,
  role,
}: UpdateAlbumCollaboratorRoleParams) {
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

  // Prevent modifying yourself
  if (targetUserId === userId) {
    throw new AppError("Cannot modify owner role", 400);
  }

  // Ensure target user is already shared
  const share = await prisma.albumShare.findUnique({
    where: {
      albumId_userId: {
        albumId,
        userId: targetUserId,
      },
    },
  });

  if (!share) {
    throw new AppError("User is not part of this album", 404);
  }

  await prisma.albumShare.update({
    where: {
      albumId_userId: {
        albumId,
        userId: targetUserId,
      },
    },
    data: { role },
  });

  return { success: true };
}

interface RemoveAlbumCollaboratorParams {
  userId: string;
  albumId: string;
  targetUserId: string;
}

export async function removeAlbumCollaboratorService({
  userId,
  albumId,
  targetUserId,
}: RemoveAlbumCollaboratorParams) {
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

    if (targetUserId === userId) {
      throw new AppError("Cannot remove album owner", 400);
    }

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

    // check if cover is owned by user
    let coverWillBeRemoved = false;

    if (album.coverMediaId) {
      const coverOwnedByUser = await tx.albumMedia.findFirst({
        where: {
          albumId,
          mediaId: album.coverMediaId,
          media: { ownerId: targetUserId },
        },
        select: { mediaId: true },
      });

      coverWillBeRemoved = !!coverOwnedByUser;
    }

    // Remove user's media
    await tx.albumMedia.deleteMany({
      where: {
        albumId,
        media: {
          ownerId: targetUserId,
        },
      },
    });

    // Fix cover if it was removed
    if (coverWillBeRemoved) {
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

export async function leaveSharedAlbumService({
  userId,
  albumId,
}: {
  userId: string;
  albumId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const album = await tx.album.findUnique({
      where: { id: albumId },
      select: {
        ownerId: true,
        coverMediaId: true,
      },
    });

    if (!album) {
      throw new AppError("Album not found", 404);
    }

    if (album.ownerId === userId) {
      throw new AppError("Owner cannot leave their own album", 400);
    }

    const share = await tx.albumShare.findUnique({
      where: {
        albumId_userId: {
          albumId,
          userId,
        },
      },
    });

    if (!share) {
      throw new AppError("User is not part of this album", 404);
    }

    // Check whether current cover will be removed with the user's media
    let coverWillBeRemoved = false;

    if (album.coverMediaId) {
      const coverOwnedByUser = await tx.albumMedia.findFirst({
        where: {
          albumId,
          mediaId: album.coverMediaId,
          media: { ownerId: userId },
        },
        select: { mediaId: true },
      });

      coverWillBeRemoved = !!coverOwnedByUser;
    }

    // Remove user's media from album
    await tx.albumMedia.deleteMany({
      where: {
        albumId,
        media: {
          ownerId: userId,
        },
      },
    });

    // Keep cover valid after removing media
    if (coverWillBeRemoved) {
      const nextMedia = await tx.albumMedia.findFirst({
        where: { albumId },
        orderBy: { addedAt: "asc" },
        select: { mediaId: true },
      });

      await tx.album.update({
        where: { id: albumId },
        data: { coverMediaId: nextMedia?.mediaId ?? null },
      });
    }

    await tx.albumShare.delete({
      where: {
        albumId_userId: {
          albumId,
          userId,
        },
      },
    });

    return { success: true };
  });
}
