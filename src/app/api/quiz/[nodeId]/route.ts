// GET /api/quiz/:nodeId?roadmapId=xxx  (Kanak + Sanvi)
import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai/generate-quiz";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const { searchParams } = new URL(req.url);
    const roadmapId = searchParams.get("roadmapId");

    if (!roadmapId) {
      return NextResponse.json({ error: "roadmapId is required" }, { status: 400 });
    }

    // Return cached quiz if it already exists (Sanvi's DB)
    const existing = await prisma.diagnosticQuiz.findUnique({
      where: { roadmapId_nodeId: { roadmapId, nodeId } },
    });

    if (existing) {
      return NextResponse.json({ nodeId, questions: existing.questions });
    }

    // Fetch the node info from the roadmap
    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const node = (roadmap.nodes as Array<{ id: string; title: string; level: string }>)
      .find((n) => n.id === nodeId);

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // Kanak: generate quiz using LLM
    const quiz = await generateQuiz(nodeId, node.title, node.level);

    // Sanvi: persist quiz so it can be reused without another LLM call
    await prisma.diagnosticQuiz.create({
      data: {
        nodeId,
        roadmapId,
        questions: quiz.questions as object[],
      },
    });

    return NextResponse.json(quiz);
  } catch (err) {
    console.error("[/api/quiz/:nodeId]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
