import { z } from "zod";

export const listMediaSchema = {
  query: z.object({
    cursor: z.string().datetime().optional(),

    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => val > 0 && val <= 100, {
        message: "Limit must be between 1 and 100"
      })
      .optional()
  })
};

export const mediaByIdParamSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};

export const updateMediaSchema = {
  params: z.object({
    id: z.string().uuid()
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
      .array(z.string().uuid())
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
    cursor: z.string().uuid().optional(),
    limit: z
      .coerce.number()
      .int()
      .min(1)
      .max(100)
      .optional(),
  }),
};