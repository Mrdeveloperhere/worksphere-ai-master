import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { PrismaClient } from "@/generated/prisma/client";

neonConfig.webSocketConstructor = ws;

// Next.js dev-mode hot-reload would otherwise spawn a new PrismaClient (and a
// new connection pool) on every file save, eventually exhausting Neon's
// connection limit. Caching the instance on `globalThis` survives reloads.
// Clear global prisma client cache on hot reload so newly generated schema changes are picked up
if (typeof globalThis !== "undefined") {
  (globalThis as any).prisma = undefined;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
