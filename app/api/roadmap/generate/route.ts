// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – POST /api/roadmap/generate
//
// Generates a personalised learning roadmap DAG via LLM and persists it
// using Sanvi's createRoadmap service.
//
// Body: { goal, existingSkills, weeklyHours, targetWeeks, userId? }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/ai/generate-roadmap";
import { createRoadmap, getRoadmap } from "@/lib/services/roadmap.service";
import { getPrisma } from "@/lib/db/prisma";

// ── Request body ──────────────────────────────────────────────────────────────

interface GenerateRoadmapBody {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  /** Number of weeks the learner wants to finish the roadmap in. */
  targetWeeks: number;
  /** Authenticated user id; omit for guest access. */
  userId?: string;
}

// ── Guest user helper ─────────────────────────────────────────────────────────

async function resolveUserId(userId?: string): Promise<string> {
  if (userId?.trim()) return userId.trim();

  // Upsert a guest user via Prisma
  const prisma = getPrisma();
  const guest = await prisma.user.upsert({
    where: { email: "guest@pathcraft.ai" },
    update: {},
    create: { email: "guest@pathcraft.ai", name: "Guest" },
  });
  return guest.id;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse & validate
  let body: GenerateRoadmapBody;
  try {
    body = (await req.json()) as GenerateRoadmapBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { goal, existingSkills, weeklyHours, targetWeeks, userId } = body;

  if (!goal || !Array.isArray(existingSkills) || !weeklyHours || !targetWeeks) {
    return NextResponse.json(
      { error: "Missing required fields: goal, existingSkills, weeklyHours, targetWeeks" },
      { status: 400 }
    );
  }

  // 2. Resolve user (guest fallback)
  let effectiveUserId: string;
  try {
    effectiveUserId = await resolveUserId(userId);
  } catch (err) {
    console.error("[generate] resolveUserId error:", err);
    return NextResponse.json({ error: "Failed to resolve user." }, { status: 500 });
  }

  // 3. Generate raw DAG via LLM
  let aiRoadmap;
  try {
    aiRoadmap = await generateRoadmap({
      goal,
      existingSkills,
      weeklyHours,
      timelineWeeks: targetWeeks, // map targetWeeks → timelineWeeks
    });
  } catch (err) {
    console.error("[generate] LLM error:", err);
    return NextResponse.json(
      { error: "Failed to generate roadmap. Please try again." },
      { status: 502 }
    );
  }

  // 4. Persist via Sanvi's createRoadmap service
  //    Map: totalEstimatedHours → totalHours (Sanvi's schema field)
  //    Nodes are stored as-is; AI fields (type, level, estimatedHours, etc.)
  //    are preserved via the open [key: string]: unknown index on RoadmapNode.
  let saved;
  try {
    saved = await createRoadmap({
      userId: effectiveUserId,
      title: aiRoadmap.title,
      goal,
      totalHours: aiRoadmap.totalEstimatedHours, // ← mapped here
      nodes: aiRoadmap.nodes,                    // AI metadata preserved
      edges: aiRoadmap.edges,
      isPublic: false,
    });
  } catch (err) {
    console.error("[generate] createRoadmap error:", err);
    return NextResponse.json({ error: "Failed to save roadmap." }, { status: 500 });
  }

  // 5. Return — include AI metadata in the response payload
  return NextResponse.json(
    {
      roadmapId: saved.id,
      title: saved.title,
      totalEstimatedHours: aiRoadmap.totalEstimatedHours,
      nodes: aiRoadmap.nodes,   // full AI nodes with type/level/estimatedHours/searchKeywords
      edges: aiRoadmap.edges,
    },
    { status: 200 }
  );
}
