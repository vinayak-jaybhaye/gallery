import { z } from "zod";

const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const allowedVideoMimeTypes = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const startUploadSchema = {
  body: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("image"),
      mimeType: z.enum(allowedImageMimeTypes),
      sizeBytes: z.number().positive().optional(),
      title: z.string().min(1).max(255),
    }),
    z.object({
      type: z.literal("video"),
      mimeType: z.enum(allowedVideoMimeTypes),
      sizeBytes: z.number().positive().optional(),
      title: z.string().min(1).max(255),
    }),
  ]),
};

export const getPartUrlsSchema = {
  body: z.object({
    partNumbers: z
      .array(z.number().int().positive())
      .min(1)
      .max(100)
  }).refine(
    (data) => {
      const unique = new Set(data.partNumbers);
      return unique.size === data.partNumbers.length;
    },
    {
      message: "Duplicate part numbers are not allowed",
      path: ["partNumbers"],
    }
  )
};