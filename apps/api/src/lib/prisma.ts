import { createPrismaClient } from "@gallery/db";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const prisma = createPrismaClient({
  connectionString: process.env.DATABASE_URL,
});

// Re-export types from db package
export * from "@gallery/db";