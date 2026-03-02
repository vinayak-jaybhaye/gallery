import { z } from "zod";

export const listMediaSchema = {
  query: z.object({
    cursor: z.iso.datetime().optional(),

    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => val > 0 && val <= 100, {
        message: "Limit must be between 1 and 100"
      })
      .optional(),

    type: z.enum(["image", "video"]).optional(),
    albumId: z.uuid().optional()
  })
};

export const mediaByIdParamSchema = {
  params: z.object({
    id: z.uuid()
  })
};

export const updateMediaSchema = {
  params: z.object({
    id: z.uuid()
  }),

  body: z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional()
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  })
};

export const deleteMediaSchema = {
  body: z.object({
    mediaIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        { message: "Duplicate media IDs are not allowed" }
      ),
  }),
};

export const recoverMediaSchema = deleteMediaSchema;

export const listDeletedMediaSchema = {
  query: z.object({
    cursor: z.iso.datetime().optional(),
    limit: z
      .coerce.number()
      .int()
      .min(1)
      .max(100)
      .optional(),
  }),
}

// sharing
export const shareMediaSchema = {
  params: z.object({
    mediaId: z.uuid(),
  }),
  body: z.object({
    email: z.email(),
  }),
};

export const removeMediaShareSchema = {
  params: z.object({
    mediaId: z.uuid(),       // mediaId
    userId: z.uuid(),   // target user
  }),
};

export const createPublicShareSchema = {
  params: z.object({
    mediaId: z.uuid(), // mediaId
  }),
  body: z.object({
    expiresInDays: z
      .number()
      .int()
      .positive()
      .max(365)
      .optional(),
  }),
};

export const revokePublicShareSchema = {
  body: z.object({
    shareIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        { message: "Duplicate share IDs are not allowed" }
      ),
  }),
};

export const publicTokenParamSchema = {
  params: z.object({
    token: z
      .string()
      .min(32)
      .max(128)
      .regex(/^[a-f0-9]+$/i),
  }),
};

export const listSharedWithMeSchema = {
  query: z.object({
    cursor: z.iso.datetime().optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => val > 0 && val <= 100)
      .optional(),
  }),
};

export const listSharedByMeSchema = listSharedWithMeSchema;
export const listMyPublicLinksSchema = listSharedWithMeSchema;
export const sharesByIdSchema = mediaByIdParamSchema;