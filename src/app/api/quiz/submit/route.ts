// POST /api/quiz/submit  (Sanvi's layer)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";

const RequestSchema = z.object({
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3)),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { roadmapId, nodeId, answers, userId } = parsed.data;

    // Resolve userId — fall back to guest
    const resolvedUserId =
      userId ??
      (await prisma.user.findUnique({ where: { email: "guest@pathcraft.ai" } }))
        ?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the stored quiz
    const quiz = await prisma.diagnosticQuiz.findUnique({
      where: { roadmapId_nodeId: { roadmapId, nodeId } },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found — load it first via GET /api/quiz/:nodeId" },
        { status: 404 }
      );
    }

    const questions = quiz.questions as Array<{
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    }>;

    // Grade: compare submitted index against stored answerIndex
    let correctCount = 0;
    const explanations: string[] = [];

    questions.forEach((q, idx) => {
      if (answers[idx] === q.answerIndex) correctCount++;
      explanations.push(q.explanation);
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score === 100;

    // Persist quiz score + auto-complete the node if perfect score
    await prisma.userProgress.upsert({
      where: {
        roadmapId_nodeId_userId: { roadmapId, nodeId, userId: resolvedUserId },
      },
      create: {
        userId: resolvedUserId,
        roadmapId,
        nodeId,
        quizScore: score,
        status: passed ? "COMPLETED" : "IN_PROGRESS",
        completedAt: passed ? new Date() : null,
      },
      update: {
        quizScore: score,
        status: passed ? "COMPLETED" : "IN_PROGRESS",
        completedAt: passed ? new Date() : null,
      },
    });

    return NextResponse.json({
      score,
      passed,
      explanations,
      autoCompleted: passed,
    });
  } catch (err) {
    console.error("[/api/quiz/submit]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
