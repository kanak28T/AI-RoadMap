// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – POST /api/roadmap/generate
//
// Generates a personalised learning roadmap DAG via LLM, enriches nodes
// with scraped resources, and persists the result.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/ai/generate-roadmap";
import { enrichRoadmap } from "@/lib/services/enrich-roadmap";
import {
  createRoadmap,
  upsertUser,
} from "@/lib/services/roadmap.service";

// ── Request body shape ────────────────────────────────────────────────────────

interface GenerateRoadmapBody {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  /** Number of weeks the learner wants to complete the roadmap in. */
  targetWeeks: number;
  /** Authenticated user id; omit for guest access. */
  userId?: string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parse & validate body ────────────────────────────────────────────
  let body: GenerateRoadmapBody;
  try {
    body = (await req.json()) as GenerateRoadmapBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { goal, existingSkills, weeklyHours, targetWeeks, userId } = body;

  if (!goal || !Array.isArray(existingSkills) || !weeklyHours || !targetWeeks) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: goal, existingSkills, weeklyHours, targetWeeks",
      },
      { status: 400 }
    );
  }

  // ── 2. Resolve user id (guest fallback) ─────────────────────────────────
  const effectiveUserId = userId?.trim()
    ? userId.trim()
    : await upsertUser({ email: "guest@pathcraft.ai", name: "Guest" });

  // ── 3. Generate raw DAG via LLM ─────────────────────────────────────────
  let rawRoadmap;
  try {
    rawRoadmap = await generateRoadmap({
      goal,
      existingSkills,
      weeklyHours,
      timelineWeeks: targetWeeks, // map targetWeeks → timelineWeeks
    });
  } catch (err) {
    console.error("[generate-roadmap] LLM error:", err);
    return NextResponse.json(
      { error: "Failed to generate roadmap. Please try again." },
      { status: 502 }
    );
  }

  // ── 4. Enrich with scraped resources (graceful fallback) ────────────────
  let enrichedRoadmap;
  try {
    enrichedRoadmap = await enrichRoadmap(rawRoadmap);
  } catch (err) {
    // Scraper services may be offline — proceed with raw DAG.
    console.warn("[enrich-roadmap] Scraper unavailable, using raw DAG:", err);
    enrichedRoadmap = rawRoadmap;
  }

  // ── 5. Persist ──────────────────────────────────────────────────────────
  let saved;
  try {
    saved = await createRoadmap(effectiveUserId, enrichedRoadmap);
  } catch (err) {
    console.error("[roadmap.service] Persist error:", err);
    return NextResponse.json(
      { error: "Failed to save roadmap." },
      { status: 500 }
    );
  }

  // ── 6. Return ───────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      roadmapId: saved.id,
      title: saved.title,
      totalEstimatedHours: saved.totalEstimatedHours,
      nodes: saved.nodes,
      edges: saved.edges,
    },
    { status: 200 }
  );
}
