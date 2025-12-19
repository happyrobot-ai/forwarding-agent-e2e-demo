import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create connection pool and Prisma client with adapter for Prisma 7
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = globalForPrisma.pool ?? new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

// Lazy getter - only initializes when accessed at runtime
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// For backward compatibility - use getPrisma() in API routes
export const prisma = {
  get incident() { return getPrisma().incident; },
  get order() { return getPrisma().order; },
  get agentRun() { return getPrisma().agentRun; },
  get truck() { return getPrisma().truck; },
  get buyer() { return getPrisma().buyer; },
  get warehouse() { return getPrisma().warehouse; },
  $transaction: (...args: Parameters<PrismaClient['$transaction']>) => getPrisma().$transaction(...args),
};
