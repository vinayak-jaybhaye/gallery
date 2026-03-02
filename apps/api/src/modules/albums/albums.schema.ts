import { z } from "zod";

export const createAlbumSchema = {
  body: z.object({
    title: z.string().trim().min(1).max(255),
    mediaIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .optional()
      .refine((ids) => !ids || new Set(ids).size === ids.length, {
        message: "Duplicate media IDs are not allowed",
      }),
  }),
};

export const listAlbumsSchema = {
  query: z.object({
    cursor: z.iso.datetime().optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => val > 0 && val <= 100, {
        message: "Limit must be between 1 and 100",
      })
      .optional(),
  }),
};

export const albumByIdParamSchema = {
  params: z.object({
    id: z.uuid(),
  }),
};

export const updateAlbumSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(255).optional(),
      coverMediaId: z.uuid().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
};

export const addMediaToAlbumSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  body: z.object({
    mediaIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Duplicate media IDs are not allowed",
      }),
  }),
};

export const removeMediaFromAlbumSchema = addMediaToAlbumSchema;

export const shareAlbumSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  body: z.object({
    userId: z.uuid(),
    role: z.enum(["viewer", "editor"]).default("viewer"),
  }),
};

export const updateAlbumShareSchema = {
  params: z.object({
    id: z.uuid(),
    userId: z.uuid(),
  }),
  body: z.object({
    role: z.enum(["viewer", "editor"]),
  }),
};

export const removeAlbumShareSchema = {
  params: z.object({
    id: z.uuid(),
    userId: z.uuid(),
  }),
};
