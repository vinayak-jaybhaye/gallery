import { z } from "zod";

export const googleAuthSchema = {
  body: z.object({
    idToken: z.string().min(10),
  })
}