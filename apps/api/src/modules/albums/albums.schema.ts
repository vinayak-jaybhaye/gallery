import { z } from "zod";

const albumIdParams = z.object({
  albumId: z.uuid(),
});

const albumShareMemberParams = z.object({
  albumId: z.uuid(),
  targetUserId: z.uuid(),
});

export const createAlbumRequestSchema = {
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

export const listAlbumsQuerySchema = {
  query: z.object({
    cursor: z.iso.datetime().optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((value) => value > 0 && value <= 100, {
        message: "Limit must be between 1 and 100",
      })
      .optional(),
  }),
};

export const albumIdParamsSchema = {
  params: albumIdParams,
};

export const updateAlbumRequestSchema = {
  params: albumIdParams,
  body: z
    .object({
      title: z.string().trim().min(1).max(255).optional(),
      coverMediaId: z.uuid().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
};

export const addAlbumMediaRequestSchema = {
  params: albumIdParams,
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

export const removeAlbumMediaRequestSchema = addAlbumMediaRequestSchema;

export const createAlbumShareRequestSchema = {
  params: albumIdParams,
  body: z.object({
    email: z.email(),
    role: z.enum(["viewer", "editor"]).default("viewer"),
  }),
};

export const listAlbumSharesRequestSchema = {
  params: albumIdParams,
};

export const updateAlbumShareRequestSchema = {
  params: albumShareMemberParams,
  body: z.object({
    role: z.enum(["viewer", "editor"]),
  }),
};

export const removeAlbumShareRequestSchema = {
  params: albumShareMemberParams,
};

export const leaveAlbumRequestSchema = albumIdParamsSchema;
