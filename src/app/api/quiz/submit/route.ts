// POST /api/quiz/submit  (Sanvi's layer)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";

const RequestSchema = z.object({
  roadmapId: z.string(),
  nodeId: z.string(),
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

    // Fetch stored quiz
    const quiz = await prisma.diagnosticQuiz.findUnique({
      where: { roadmapId_nodeId: { roadmapId, nodeId } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found for this node" }, { status: 404 });
    }

    const questions = quiz.questions as Array<{
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    }>;

    // Grade answers
    let correctCount = 0;
    const explanations: string[] = [];

    questions.forEach((q, idx) => {
      if (answers[idx] === q.answerIndex) correctCount++;
      explanations.push(q.explanation);
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score === 100;

    // Resolve userId
    const resolvedUserId =
      userId ??
      (await prisma.user.findUnique({ where: { email: "guest@pathcraft.ai" } }))?.id;

    // Persist quiz score + auto-complete if passed
    let autoCompleted = false;
    if (resolvedUserId) {
      await prisma.userProgress.upsert({
        where: {
          roadmapId_nodeId_userId: { roadmapId, nodeId, userId: resolvedUserId },
        },
        update: {
          quizScore: score,
          ...(passed ? { status: "COMPLETED", completedAt: new Date() } : {}),
        },
        create: {
          userId: resolvedUserId,
          roadmapId,
          nodeId,
          quizScore: score,
          status: passed ? "COMPLETED" : "IN_PROGRESS",
          ...(passed ? { completedAt: new Date() } : {}),
        },
      });
      autoCompleted = passed;
    }

    return NextResponse.json({ score, passed, explanations, autoCompleted });
  } catch (err) {
    console.error("[/api/quiz/submit]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
