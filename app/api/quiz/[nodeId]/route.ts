// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – GET /api/quiz/[nodeId]
//
// Returns a 3-question diagnostic MCQ quiz for a roadmap node.
// Checks Sanvi's diagnosticQuiz Prisma table first; falls back to LLM
// generation and caches the result.
//
// Query params:
//   roadmapId  (required) – used for cache scoping and node lookup
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai/generate-quiz";
import { getRoadmap } from "@/lib/services/roadmap.service";
import { getPrisma } from "@/lib/db/prisma";
import type { AIRoadmapNode } from "@/lib/ai/generate-roadmap";

// ── Route params ──────────────────────────────────────────────────────────────

interface RouteParams {
  params: { nodeId: string };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { nodeId } = params;

  // 1. Resolve roadmapId from query string
  const roadmapId = req.nextUrl.searchParams.get("roadmapId");
  if (!roadmapId) {
    return NextResponse.json(
      { error: "Missing required query parameter: roadmapId" },
      { status: 400 }
    );
  }

  const prisma = getPrisma();

  // 2. Check Sanvi's diagnosticQuiz cache
  try {
    const cached = await prisma.diagnosticQuiz.findFirst({
      where: { nodeId, roadmapId },
    });
    if (cached) {
      return NextResponse.json(
        { nodeId: cached.nodeId, questions: cached.questions },
        { status: 200 }
      );
    }
  } catch (err) {
    // Non-fatal during early dev — log and fall through to LLM.
    console.warn("[quiz] Prisma cache lookup failed, falling back to LLM:", err);
  }

  // 3. Fetch roadmap to extract node title + level
  let storedRoadmap;
  try {
    storedRoadmap = await getRoadmap(roadmapId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch roadmap.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // 4. Locate the node — AI metadata is stored in open [key: string]: unknown
  const nodes = (storedRoadmap.nodes as AIRoadmapNode[]) ?? [];
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    return NextResponse.json(
      { error: `Node "${nodeId}" not found in roadmap "${roadmapId}".` },
      { status: 404 }
    );
  }

  const nodeTitle = node.title ?? nodeId;
  const nodeLevel = (node.level as string) ?? "Core";

  // 5. Generate quiz via LLM
  let quiz;
  try {
    quiz = await generateQuiz(nodeId, nodeTitle, nodeLevel);
  } catch (err) {
    console.error("[quiz] generateQuiz LLM error:", err);
    return NextResponse.json(
      { error: "Failed to generate quiz. Please try again." },
      { status: 502 }
    );
  }

  // 6. Cache in Sanvi's diagnosticQuiz table (non-fatal if it fails)
  try {
    await prisma.diagnosticQuiz.create({
      data: {
        nodeId,
        roadmapId,
        questions: quiz.questions as object[],
      },
    });
  } catch (err) {
    console.warn("[quiz] Failed to cache quiz in DB:", err);
  }

  // 7. Return
  return NextResponse.json(
    { nodeId: quiz.nodeId, questions: quiz.questions },
    { status: 200 }
  );
}
