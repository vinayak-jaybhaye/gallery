import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { getObject, uploadObject } from "../lib/s3";

export async function processImage(media: any) {
  const buffer = await getObject(media.originalKey);

  const image = sharp(buffer);

  // Extract metadata
  const metadata = await image.metadata();

  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  // Generate optimized version
  const optimizedBuffer = await image
    .rotate() // auto-fix orientation
    .jpeg({
      quality: 82,
      mozjpeg: true,
    })
    .toBuffer();

  const masterKey = `users/${media.ownerId}/${media.id}/master.jpg`;

  await uploadObject(masterKey, optimizedBuffer, "image/jpeg");

  // Generate thumbnail
  const thumbnailBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 300,
      withoutEnlargement: true,
    })
    .jpeg({ quality: 75 })
    .toBuffer();

  const thumbnailKey = `users/${media.ownerId}/${media.id}/thumbnail.jpg`;

  await uploadObject(thumbnailKey, thumbnailBuffer, "image/jpeg");

  // Update DB
  await prisma.media.update({
    where: { id: media.id },
    data: {
      thumbnailKey: thumbnailKey,
      masterKey: masterKey,
      mimeType: "image/jpeg",
      width,
      height,
      status: "ready",
    },
  });
}