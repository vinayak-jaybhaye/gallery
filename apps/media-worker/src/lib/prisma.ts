import { createPrismaClient, PrismaClient } from "@gallery/db";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const prisma: PrismaClient = createPrismaClient({
  connectionString: process.env.DATABASE_URL,
});
