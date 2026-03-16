import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // During build time, return a proxy that throws on actual use
    // This prevents crashes during Next.js static page collection
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === "then" || prop === Symbol.toPrimitive) return undefined;
        throw new Error(
          `Prisma client accessed without DATABASE_URL (property: ${String(prop)}). This likely means a server component is being statically prerendered.`
        );
      },
    });
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
