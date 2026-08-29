// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – POST /api/roadmap/generate
//
// Generates a two-tier hierarchical roadmap (spine + sub-topics) via LLM,
// flattens it to a React Flow DAG, and persists via Sanvi's createRoadmap.
//
// Response includes BOTH:
//   spine  → for the new accordion / curriculum view (Priyanshu's UI)
//   nodes + edges → 100% plug-and-play with the existing React Flow canvas
//
// Body: { goal, existingSkills, weeklyHours, targetWeeks, userId? }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  generateTwoTierRoadmap,
  convertSpineToDAG,
} from "@/lib/ai/generate-roadmap";
import { createRoadmap } from "@/lib/services/roadmap.service";
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
  // 1. Parse & validate body
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

  // 3. Generate two-tier hierarchical roadmap via LLM
  let hierarchical;
  try {
    hierarchical = await generateTwoTierRoadmap({
      goal,
      existingSkills,
      weeklyHours,
      timelineWeeks: targetWeeks,
    });
  } catch (err) {
    console.error("[generate] LLM error:", err);
    return NextResponse.json(
      { error: "Failed to generate roadmap. Please try again." },
      { status: 502 }
    );
  }

  // 4. Flatten spine → React Flow DAG (backward-compatible nodes + edges)
  const { nodes, edges } = convertSpineToDAG(hierarchical.spine);

  // 5. Persist via Sanvi's createRoadmap
  //    totalEstimatedHours → totalHours (Sanvi's schema field name)
  //    nodes carry all AI metadata via open [key: string]: unknown index
  let saved;
  try {
    saved = await createRoadmap({
      userId: effectiveUserId,
      title: hierarchical.title,
      goal,
      totalHours: hierarchical.totalEstimatedHours,
      nodes,   // flat React Flow nodes with full AI metadata
      edges,
      isPublic: false,
    });
  } catch (err) {
    console.error("[generate] createRoadmap error:", err);
    return NextResponse.json({ error: "Failed to save roadmap." }, { status: 500 });
  }

  // 6. Return unified payload
  //    spine        → new accordion / curriculum view
  //    nodes/edges  → existing React Flow canvas (no breaking change)
  return NextResponse.json(
    {
      roadmapId:            saved.id,
      title:                hierarchical.title,
      targetWeeks,
      totalHours:           hierarchical.totalEstimatedHours,   // Sanvi's field name
      totalEstimatedHours:  hierarchical.totalEstimatedHours,   // AI layer field name
      spine:                hierarchical.spine,                 // Two-tier curriculum view
      nodes,                                                    // React Flow canvas
      edges,                                                    // React Flow canvas
    },
    { status: 200 }
  );
}
