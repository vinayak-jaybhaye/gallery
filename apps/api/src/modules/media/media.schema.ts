import { z } from "zod";

const mediaIdParams = z.object({
  mediaId: z.uuid(),
});

const mediaShareMemberParams = z.object({
  mediaId: z.uuid(),
  targetUserId: z.uuid(),
});

const cursorLimitQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

const mediaIdsBodySchema = z.object({
  mediaIds: z
    .array(z.uuid())
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplicate media IDs are not allowed",
    }),
});

export const listMediaLibraryQuerySchema = {
  query: cursorLimitQuerySchema.extend({
    type: z.enum(["image", "video"]).optional(),
    albumId: z.uuid().optional(),
  }),
};

export const mediaIdParamsSchema = {
  params: mediaIdParams,
};

export const updateMediaDetailsRequestSchema = {
  params: mediaIdParams,
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
};

export const moveMediaToTrashRequestSchema = {
  body: mediaIdsBodySchema,
};

export const restoreMediaFromTrashRequestSchema = moveMediaToTrashRequestSchema;

export const listMediaTrashQuerySchema = {
  query: z.object({
    cursor: z.string().min(1).optional(),
    limit: z
      .coerce.number()
      .int()
      .min(1)
      .max(100)
      .optional(),
  }),
};

export const createMediaShareRequestSchema = {
  params: mediaIdParams,
  body: z.object({
    email: z.email(),
  }),
};

export const deleteMediaShareRequestSchema = {
  params: mediaShareMemberParams,
};

export const createPublicMediaLinkRequestSchema = {
  params: mediaIdParams,
  body: z.object({
    expiresInSeconds: z
      .number()
      .int()
      .positive()
      .max(31536000)
      .optional(),
  }),
};

export const revokePublicMediaLinksRequestSchema = {
  body: z.object({
    shareIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Duplicate share IDs are not allowed",
      }),
  }),
};

export const publicMediaTokenParamsSchema = {
  params: z.object({
    token: z
      .string()
      .length(64)
      .regex(/^[a-f0-9]+$/, "Invalid token format"),
  }),
};

export const listReceivedMediaQuerySchema = {
  query: cursorLimitQuerySchema,
};

export const listSentMediaQuerySchema = listReceivedMediaQuerySchema;
export const listOwnedPublicLinksQuerySchema = listReceivedMediaQuerySchema;

export const listMediaShareRecipientsRequestSchema = {
  params: mediaIdParams,
};

export const listMediaPublicLinksRequestSchema = {
  params: mediaIdParams,
};
