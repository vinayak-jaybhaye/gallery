/**
 * Seed utility: creates test data in the database for benchmarking.
 * Uses Prisma directly (not the API) for speed and determinism.
 */
import { createPrismaClient } from "@gallery/db";
import { createS3Client, PutObjectCommand } from "@gallery/s3";
import fs from "fs";
import path from "path";

const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/gallery"
});

const SAMPLE_MEDIA_DIR = path.resolve(__dirname, "../../../..", "sample-media");

const s3Client = createS3Client({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:4566",
});

const BUCKET = process.env.S3_BUCKET || "gallery-bucket";

/**
 * Ensure a bench test user exists.
 */
export async function ensureBenchUser(): Promise<{ id: string; email: string }> {
  const email = "bench@gallery.local";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return { id: user.id, email: user.email };
}

/**
 * Get available sample media files from the sample-media directory.
 */
export function getSampleMedia(): { images: string[]; videos: string[] } {
  if (!fs.existsSync(SAMPLE_MEDIA_DIR)) {
    throw new Error(`Sample media directory not found: ${SAMPLE_MEDIA_DIR}`);
  }

  const files = fs.readdirSync(SAMPLE_MEDIA_DIR);
  const images = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
  const videos = files.filter((f) => /\.(mp4|mov|webm)$/i.test(f));

  return { images, videos };
}

/**
 * Upload a sample file to S3 and create a media record in "processing" state.
 * Returns the mediaId.
 */
export async function seedMediaRecord(opts: {
  userId: string;
  filename: string;
  type: "image" | "video";
}): Promise<string> {
  const { userId, filename, type } = opts;
  const filePath = path.join(SAMPLE_MEDIA_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  const mediaId = crypto.randomUUID();
  const originalKey = `users/${userId}/${mediaId}/original`;

  const mimeType = type === "image"
    ? (filename.endsWith(".png") ? "image/png" : "image/jpeg")
    : "video/mp4";

  // Upload to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: originalKey,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  // Create DB record
  await prisma.media.create({
    data: {
      id: mediaId,
      ownerId: userId,
      type,
      mimeType,
      sizeBytes: BigInt(buffer.length),
      title: filename,
      originalKey,
      status: "processing",
    },
  });

  return mediaId;
}

/**
 * Seed N "ready" media records (no actual S3 files — just DB rows for query benchmarks).
 */
export async function seedReadyMediaRecords(
  userId: string,
  count: number
): Promise<string[]> {
  if (count <= 1000) {
    const ids: string[] = [];
    const data = Array.from({ length: count }).map((_, i) => {
      const mediaId = crypto.randomUUID();
      ids.push(mediaId);
      return {
        id: mediaId,
        ownerId: userId,
        type: "image",
        mimeType: "image/jpeg",
        sizeBytes: BigInt(1024 * 1024),
        title: `bench-media-${i}`,
        originalKey: `users/${userId}/${mediaId}/original`,
        thumbnailKey: `users/${userId}/${mediaId}/thumbnail.jpg`,
        masterKey: `users/${userId}/${mediaId}/master.jpg`,
        width: 1920,
        height: 1080,
        status: "ready",
      };
    });
    
    // Batch create via Prisma
    await prisma.media.createMany({ data });
    return ids;
  }

  // Fast bulk insert using PostgreSQL generate_series
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Media" (
      "id", "ownerId", "type", "mimeType", "sizeBytes", 
      "title", "originalKey", "thumbnailKey", "masterKey", 
      "width", "height", "status", "createdAt", "updatedAt"
    )
    SELECT 
      gen_random_uuid()::text,
      $1,
      'image',
      'image/jpeg',
      1048576,
      'bench-media-' || i,
      'users/' || $1 || '/' || i || '/original',
      'users/' || $1 || '/' || i || '/thumbnail.jpg',
      'users/' || $1 || '/' || i || '/master.jpg',
      1920,
      1080,
      'ready',
      now(),
      now()
    FROM generate_series(1, $2) as i;
  `, userId, count);

  return []; // Large batches don't return all IDs
}

/**
 * Clean up all bench-generated data.
 */
export async function cleanupBenchData(): Promise<void> {
  const benchUser = await prisma.user.findUnique({
    where: { email: "bench@gallery.local" },
  });

  if (benchUser) {
    // Delete all media (cascades to upload sessions, shares, etc.)
    await prisma.media.deleteMany({ where: { ownerId: benchUser.id } });
    // Delete all albums
    await prisma.album.deleteMany({ where: { ownerId: benchUser.id } });
  }
}

export { prisma };
