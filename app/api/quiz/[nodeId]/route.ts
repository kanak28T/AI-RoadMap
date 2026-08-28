import { NextResponse } from "next/server";
import { generateQuiz } from "../../../../lib/ai/generate-quiz";
import { getPrisma } from "../../../../lib/db/prisma";
import { getRoadmapGraph } from "../../../../lib/services/roadmap.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  try {
    const { nodeId } = await context.params;
    const url = new URL(request.url);
    const roadmapId = url.searchParams.get("roadmapId");
    const userId = url.searchParams.get("userId") ?? undefined;

    if (!roadmapId) {
      return NextResponse.json(
        { success: false, error: "roadmapId is required" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const cached = await prisma.diagnosticQuiz.findUnique({
      where: { roadmapId_nodeId: { roadmapId, nodeId } },
    });
    if (cached) {
      return NextResponse.json({ nodeId, questions: cached.questions });
    }

    const roadmap = await getRoadmapGraph(roadmapId, userId);
    const node = roadmap.nodes.find((item) => item.id === nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: "Node not found" },
        { status: 404 },
      );
    }

    const quiz = await generateQuiz(nodeId, node.title, node.level);
    await prisma.diagnosticQuiz.create({
      data: {
        roadmapId,
        nodeId,
        questions: JSON.parse(JSON.stringify(quiz.questions)),
      },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Quiz generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    const status = message === "Roadmap not found" ? 404 : message.includes("access") ? 403 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
