import ffmpeg from "fluent-ffmpeg";
import { prisma } from "../lib/prisma";
import { getObject, uploadObject } from "../lib/s3";
import fs from "fs";
import path from "path";

export async function processVideo(media: any) {
  const tempInput = `/tmp/${media.id}-input`;
  const tempOutputVideo = `/tmp/${media.id}-optimized.mp4`;
  const tempOutputThumb = `/tmp/${media.id}-thumb.jpg`;

  try {
    // Download original file
    const buffer = await getObject(media.originalKey);
    await fs.promises.writeFile(tempInput, buffer);

    // Transcode to streaming-optimized MP4
    await new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-c:a aac",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
          "-profile:v high",
          "-level 4.0",
        ])
        .save(tempOutputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // Extract metadata from optimized video
    const metadata = await getVideoMetadata(tempOutputVideo);

    // Generate thumbnail
    await new Promise((resolve, reject) => {
      ffmpeg(tempOutputVideo)
        .screenshots({
          timestamps: ["1"],
          filename: path.basename(tempOutputThumb),
          folder: "/tmp",
          size: "300x?",
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Upload optimized video
    const optimizedBuffer = await fs.promises.readFile(tempOutputVideo);
    const masterKey = `users/${media.ownerId}/${media.id}/master.mp4`;

    await uploadObject(masterKey, optimizedBuffer, "video/mp4");

    // Upload thumbnail
    const thumbnailBuffer = await fs.promises.readFile(tempOutputThumb);
    const thumbnailKey = `users/${media.ownerId}/${media.id}/thumbnail.jpg`;

    await uploadObject(thumbnailKey, thumbnailBuffer, "image/jpeg");

    // Update database
    await prisma.media.update({
      where: { id: media.id },
      data: {
        masterKey: masterKey,
        thumbnailKey: thumbnailKey,
        width: metadata.width,
        height: metadata.height,
        mimeType: "video/mp4",
        durationSeconds: metadata.duration,
        status: "ready",
      },
    });
  } finally {
    // Cleanup
    const files = [tempInput, tempOutputVideo, tempOutputThumb];
    for (const file of files) {
      if (fs.existsSync(file)) {
        await fs.promises.unlink(file);
      }
    }
  }
}
interface VideoMetadata {
  width: number;
  height: number;
  duration: number | null;
}

function parseDuration(raw: any): number | null {
  if (!raw || raw === "N/A") return null;

  const parsed = Number(raw);
  if (isNaN(parsed)) return null;

  return Math.round(parsed);
}

function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(
        (stream: any) => stream.codec_type === "video"
      );

      if (!videoStream) {
        return reject(new Error("No video stream found"));
      }

      const width = videoStream.width ?? null;
      const height = videoStream.height ?? null;

      // Try multiple duration sources (more robust)
      const rawDuration =
        metadata.format?.duration ??
        videoStream?.duration ??
        null;

      resolve({
        width,
        height,
        duration: parseDuration(rawDuration),
      });
    });
  });
}