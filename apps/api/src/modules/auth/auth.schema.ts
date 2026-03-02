import { z } from "zod";

export const googleAuthSchema = {
  body: z.object({
    idToken: z.string().min(10),
  })
}

export const credentialsLoginSchema = {
  body: z.object({
    email: z.email(),
    password: z.string().min(6).max(128),
  })
}