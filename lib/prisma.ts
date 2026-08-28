// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Prisma Client Singleton
//
// Exports a single shared PrismaClient instance, reusing the global reference
// in development to avoid exhausting DB connections during hot-reloads.
//
// TODO: run `npx prisma init` and define your schema, then remove the stub
//       below and uncomment the real client instantiation.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Re-use the client across hot-reloads in development.
export const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
