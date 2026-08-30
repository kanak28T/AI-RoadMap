// GET /api/quiz/:nodeId?roadmapId=xxx (Kanak + Sanvi)
import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai/generate-quiz";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const { searchParams } = new URL(req.url);
    const roadmapId = searchParams.get("roadmapId");

    if (!roadmapId) {
      return NextResponse.json(
        { error: "roadmapId is required" },
        { status: 400 }
      );
    }

    // Return cached quiz if it already exists (Sanvi's DB)
    const existing = await prisma.diagnosticQuiz.findUnique({
      where: { roadmapId_nodeId: { roadmapId, nodeId } },
    });

    if (existing) {
      return NextResponse.json({
        nodeId,
        questions: existing.questions,
      });
    }

    // Fetch the node info from the roadmap
    const roadmap = await prisma.roadmap.findUnique({
      where: { id: roadmapId },
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      );
    }

    const nodes = (roadmap.nodes as Array<any>) || [];
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      return NextResponse.json(
        { error: "Node not found in roadmap" },
        { status: 404 }
      );
    }

    // Support both `node.title` and `node.label` naming conventions
    const topicTitle = node.title || node.label || "Core Concept";
    const topicLevel = node.level || "Intermediate";

    // Kanak: generate quiz using LLM
    const quiz = await generateQuiz(nodeId, topicTitle, topicLevel);

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
