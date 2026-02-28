import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export interface DbConfig {
  connectionString: string;
}

export function createPrismaClient(config: DbConfig) {
  const adapter = new PrismaPg({
    connectionString: config.connectionString,
  });

  return new PrismaClient({ adapter });
}

// Re-export Prisma types for convenience
export * from "./generated/prisma/client";
