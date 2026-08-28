// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Persistence Service
//
// Thin wrapper around Prisma for roadmap CRUD operations.
// Replace the stubs with real Prisma calls once the schema is wired.
// ─────────────────────────────────────────────────────────────────────────────

import type { GeneratedRoadmap } from "../../types/roadmap";

export interface PersistedRoadmap extends GeneratedRoadmap {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persists a new roadmap for the given user and returns the stored record
 * (including the generated `id`).
 *
 * TODO: replace stub with:
 *   return prisma.roadmap.create({ data: { userId, ...roadmap } });
 */
export async function createRoadmap(
  userId: string,
  roadmap: GeneratedRoadmap
): Promise<PersistedRoadmap> {
  // Stub – generates a deterministic-looking id so downstream code compiles.
  const id = `roadmap_${Date.now()}`;
  return {
    id,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...roadmap,
  };
}

/**
 * Fetches a roadmap by its id.
 *
 * TODO: replace stub with:
 *   return prisma.roadmap.findUniqueOrThrow({ where: { id: roadmapId } });
 */
export async function getRoadmap(
  roadmapId: string
): Promise<PersistedRoadmap | null> {
  // Stub – returns null (cache miss) so the reroute route always calls the AI.
  void roadmapId;
  return null;
}

/**
 * Overwrites the node/edge graph of an existing roadmap.
 *
 * TODO: replace stub with:
 *   return prisma.roadmap.update({ where: { id: roadmapId }, data: { nodes, edges, totalEstimatedHours } });
 */
export async function updateRoadmapGraph(
  roadmapId: string,
  updatedGraph: GeneratedRoadmap
): Promise<PersistedRoadmap> {
  return {
    id: roadmapId,
    userId: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...updatedGraph,
  };
}

/**
 * Upserts a user by email, returning their id.
 * Used for guest-user fallback in API routes.
 *
 * TODO: replace stub with:
 *   const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email, name } });
 *   return user.id;
 */
export async function upsertUser(params: {
  email: string;
  name: string;
}): Promise<string> {
  // Stub – returns a stable guest id.
  void params;
  return "guest_user_id";
}
