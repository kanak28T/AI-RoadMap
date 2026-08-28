// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – GET /api/quiz/[nodeId]
//
// Returns a 3-question diagnostic MCQ quiz for a roadmap node.
// Checks the Prisma DB cache first; falls back to LLM generation and
// persists the result for future requests.
//
// Query params:
//   roadmapId  (required) – the parent roadmap, used for cache scoping
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai/generate-quiz";
import { getRoadmap } from "@/lib/services/roadmap.service";
import { prisma } from "@/lib/prisma";

// ── Route params shape ────────────────────────────────────────────────────────

interface RouteParams {
  params: { nodeId: string };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { nodeId } = params;

  // ── 1. Resolve roadmapId from query string ───────────────────────────────
  const roadmapId = req.nextUrl.searchParams.get("roadmapId");
  if (!roadmapId) {
    return NextResponse.json(
      { error: "Missing required query parameter: roadmapId" },
      { status: 400 }
    );
  }

  // ── 2. Check Prisma cache ────────────────────────────────────────────────
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
    // DB may not be available during early dev — log and continue to LLM.
    console.warn("[quiz] Prisma cache lookup failed, falling back to LLM:", err);
  }

  // ── 3. Fetch roadmap to extract node title + level ───────────────────────
  let roadmap;
  try {
    roadmap = await getRoadmap(roadmapId);
  } catch (err) {
    console.error("[quiz] getRoadmap error:", err);
    return NextResponse.json(
      { error: "Failed to fetch roadmap." },
      { status: 500 }
    );
  }

  if (!roadmap) {
    return NextResponse.json(
      { error: `Roadmap "${roadmapId}" not found.` },
      { status: 404 }
    );
  }

  const node = roadmap.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return NextResponse.json(
      { error: `Node "${nodeId}" not found in roadmap "${roadmapId}".` },
      { status: 404 }
    );
  }

  // ── 4. Generate quiz via LLM ─────────────────────────────────────────────
  let quiz;
  try {
    quiz = await generateQuiz(nodeId, node.title, node.level);
  } catch (err) {
    console.error("[quiz] generateQuiz LLM error:", err);
    return NextResponse.json(
      { error: "Failed to generate quiz. Please try again." },
      { status: 502 }
    );
  }

  // ── 5. Persist to DB cache ───────────────────────────────────────────────
  try {
    await prisma.diagnosticQuiz.create({
      data: {
        nodeId,
        roadmapId,
        questions: quiz.questions,
      },
    });
  } catch (err) {
    // Non-fatal — return the quiz even if caching fails.
    console.warn("[quiz] Failed to cache quiz in DB:", err);
  }

  // ── 6. Return ────────────────────────────────────────────────────────────
  return NextResponse.json(
    { nodeId: quiz.nodeId, questions: quiz.questions },
    { status: 200 }
  );
}
