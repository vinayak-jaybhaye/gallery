import { enqueueMediaProcessingJob } from "@gallery/queue";
import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import {
  CreateMultipartUploadCommand,
  PutObjectCommand,
  HeadObjectCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { AppError } from "@/middlewares/error.middleware";

const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB
const PART_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_SESSION_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days
const BUCKET = process.env.S3_BUCKET;

export async function startUploadService({
  userId,
  type,
  mimeType,
  sizeBytes,
  title,
  source
}: {
  userId: string;
  type: "image" | "video";
  mimeType: string;
  sizeBytes: number; // 0 if source is streaming
  title: string;
  source: "file" | "streaming";
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new AppError("User not found", 404);

  // Early quota check only if size is known
  if (user.storageUsedBytes + BigInt(sizeBytes) > user.storageQuotaBytes) {
    throw new AppError("Storage quota exceeded", 400);
  }

  const mediaId = randomUUID();
  const originalKey = `users/${userId}/${mediaId}/original`;

  await prisma.media.create({
    data: {
      id: mediaId,
      ownerId: userId,
      type,
      mimeType,
      sizeBytes: sizeBytes !== undefined ? BigInt(sizeBytes) : null,
      title,
      originalKey,
      status: "uploading",
    },
  });

  // If size unknown  force multipart
  const shouldUseMultipart = sizeBytes > MULTIPART_THRESHOLD || source === "streaming";

  if (!shouldUseMultipart) {
    // SINGLE UPLOAD
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: originalKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5,
    });

    return {
      uploadType: "single",
      mediaId,
      uploadUrl,
    };
  }

  // MULTIPART UPLOAD
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: BUCKET,
    Key: originalKey,
    ContentType: mimeType,
  });

  const multipart = await s3Client.send(createCommand);

  if (!multipart.UploadId) {
    throw new AppError("Failed to initiate multipart upload", 500);
  }

  await prisma.uploadSession.create({
    data: {
      mediaId,
      s3UploadId: multipart.UploadId,
      expiresAt: new Date(Date.now() + UPLOAD_SESSION_EXPIRY),
      source,
    },
  });

  return {
    uploadType: "multipart",
    mediaId,
    partSize: PART_SIZE,
  };
}

// complete upload
export async function completeUploadService({
  userId,
  mediaId,
}: {
  userId: string;
  mediaId: string;
}) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media || media.ownerId !== userId) {
    throw new AppError("Media not found", 404);
  }

  if (media.status !== "uploading") {
    throw new AppError("Invalid media state", 400);
  }

  const uploadSession = await prisma.uploadSession.findUnique({
    where: { mediaId },
  });

  // MULTIPART
  if (uploadSession) {
    // fetch completed parts from s3

    const listParts = await s3Client.send(
      new ListPartsCommand({
        Bucket: BUCKET,
        Key: media.originalKey,
        UploadId: uploadSession.s3UploadId,
      })
    );

    if (!listParts.Parts || listParts.Parts.length === 0) {
      throw new AppError("No parts uploaded for multipart upload", 400);
    }

    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: media.originalKey,
        UploadId: uploadSession.s3UploadId,
        MultipartUpload: {
          Parts: listParts.Parts.map((p) => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag,
          })),
        },
      })
    );

    await prisma.uploadSession.delete({
      where: { mediaId },
    });
  }

  // VERIFY OBJECT (for both single & multipart)
  let actualSize: bigint;

  try {
    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: media.originalKey,
      })
    );

    actualSize = BigInt(head.ContentLength ?? 0);

  } catch (error: any) {
    if (error.$metadata?.httpStatusCode === 404) {
      throw new AppError(
        "File not found in storage. Upload may not have completed.",
        400
      );
    }

    throw new AppError("Failed to verify uploaded file", 500);
  }

  // QUOTA CHECK
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.storageUsedBytes + actualSize > user.storageQuotaBytes) {
    // Optional: delete object from S3 here
    throw new AppError("Storage quota exceeded", 400);
  }

  // ATOMIC UPDATE
  await prisma.$transaction([
    prisma.media.update({
      where: { id: mediaId },
      data: {
        sizeBytes: actualSize,
        status: "processing",
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        storageUsedBytes: {
          increment: actualSize,
        },
      },
    }),
  ]);

  await enqueueMediaProcessingJob(mediaId);

  return { success: true };
}

export async function getPartUploadUrlsService({
  userId,
  mediaId,
  partNumbers
}: {
  userId: string;
  mediaId: string;
  partNumbers: number[];
}) {
  const session = await prisma.uploadSession.findUnique({
    where: { mediaId },
    include: { media: true },
  });

  if (!session || session.media.ownerId !== userId) {
    throw new AppError("Invalid upload session", 400);
  }

  if (session.expiresAt < new Date()) {
    throw new AppError("Upload session expired", 400);
  }

  try {
    const urls = await Promise.all(
      partNumbers.map(async (partNumber) => {
        const command = new UploadPartCommand({
          Bucket: BUCKET,
          Key: session.media.originalKey,
          UploadId: session.s3UploadId,
          PartNumber: partNumber,
        });

        const url = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 5,
        });

        return { partNumber, url };
      })
    );

    return { urls };
  } catch (error) {
    console.error("Failed to generate part upload URLs:", error);
    throw new AppError("Failed to generate part upload URLs", 500);
  }
}

export async function abortUploadService({
  userId,
  mediaId
}: {
  userId: string;
  mediaId: string;
}) {
  const session = await prisma.uploadSession.findUnique({
    where: { mediaId },
    include: { media: true },
  });

  if (!session || session.media.ownerId !== userId) {
    throw new AppError("Invalid upload session", 400);
  }

  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: session.media.originalKey,
      UploadId: session.s3UploadId,
    })
  );

  // delete media and upload session
  await prisma.media.delete({
    where: { id: session.mediaId },
  });

  return {
    success: true,
  };
}

export async function getUploadStatusService({
  userId,
  mediaId
}: {
  userId: string;
  mediaId: string;
}) {
  const session = await prisma.uploadSession.findUnique({
    where: { mediaId },
    include: { media: true },
  });

  if (!session || session.media.ownerId !== userId) {
    throw new AppError("Invalid upload session", 400);
  }

  if (session.media.status !== "uploading") {
    throw new AppError("Media not in uploading status", 400);
  }

  const result = await s3Client.send(
    new ListPartsCommand({
      Bucket: BUCKET,
      Key: session.media.originalKey,
      UploadId: session.s3UploadId,
    })
  );

  const uploadedParts =
    result.Parts?.map((part) => ({
      partNumber: part.PartNumber,
      sizeBytes: part.Size,
      etag: part.ETag!,
    })) || [];


  return {
    uploadedParts,
    partSize: PART_SIZE
  };
}

export async function listUploadSessionsService({
  userId,
}: {
  userId: string;
}) {
  // list out the multipart upload sessions
  const sessions = await prisma.uploadSession.findMany({
    where: {
      media: {
        ownerId: userId
      }
    },
    include: {
      media: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return sessions.map((session) => ({
    mediaId: session.mediaId,
    title: session.media.title,
    type: session.media.type,
    source: session.source,
    mimeType: session.media.mimeType,
    sizeBytes: session.media.sizeBytes,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  }));
}

// TODO::CLEANUP JOB FOR MISSING COMPLETE UPLOAD REQUESTS FOR SINGLE UPLOADS
// const staleSingleUploads = await prisma.media.findMany({
//   where: {
//     status: "uploading",
//     uploadSession: null, // confirms this is single upload
//     createdAt: {
//       lt: new Date(Date.now() - 60 * 60 * 1000),
//     },
//   },
// });

// TODO: CLEANUP JOB FOR MULTIPART UPLOAD
// const expiredSessions = await prisma.uploadSession.findMany({
//   where: {
//     expiresAt: {
//       lt: new Date(),
//     },
//   },
//   include: {
//     media: true,
//   },
// });
// for (const session of expiredSessions) {
//   // Abort multipart upload in S3
//   await s3Client.send(
//     new AbortMultipartUploadCommand({
//       Bucket: process.env.S3_BUCKET!,
//       Key: session.media.originalKey,
//       UploadId: session.s3UploadId,
//     })
//   ).catch(() => {});

//   // Delete media (this will cascade delete uploadSession)
//   await prisma.media.delete({
//     where: { id: session.mediaId },
//   });
// }

/*
 * CONTEXT — why these cleanup jobs matter (not implemented yet):
 *
 * Media stays status "uploading" until POST /:id/complete succeeds. There is no DB "failed"
 * upload state. The web uploadStore may show "failed", but that is client-only.
 *
 * - Single upload (no UploadSession): user can abandon or PUT succeeds but complete fails →
 *   orphan Media + possible S3 original. DELETE /uploads/:id (abort) does not apply.
 * - Multipart/streaming: UploadSession expires after 3 days (part-urls rejected); rows and S3
 *   multipart are not removed automatically. User can abort via DELETE /uploads/:id (see
 *   abortUploadService) while status is still "uploading".
 *
 * Orphans do not appear in the library (API lists ready/processing only). Without the jobs
 * above, stale uploading rows and S3 objects accumulate until manual abort or a future cron.
 *
 * FIX (short):
 * 1) Single-upload TODO — hourly job: find stale uploading + no UploadSession (e.g. createdAt
 *    > UPLOAD_STALE_HOURS ago) → DeleteObject(originalKey) if present → prisma.media.delete.
 * 2) Multipart TODO — same job: find UploadSession.expiresAt < now → AbortMultipartUpload →
 *    prisma.media.delete (cascade session). Uncomment/adapt loops above.
 * 3) Also extend abortUploadService: no session but status uploading → delete S3 original +
 *    media (so UI “discard” works for single PUT). Wire web failed upload → DELETE /uploads/:id.
 *
 * Processing stuck after 3 BullMQ fails is separate (media-worker): add processing_failed status,
 * set on final job failure, remove failed Redis job before re-enqueue, POST retry-processing.
 */

// TODO::LATER ADD S3 EVENT NOTIFICATIONS (SQS/SNS)