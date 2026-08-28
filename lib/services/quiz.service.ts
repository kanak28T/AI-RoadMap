import { getPrisma } from "../db/prisma";
import type { QuizQuestion, QuizResult } from "../../types/quiz";
import type { RoadmapGraph } from "../../types/roadmap";

function getQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is QuizQuestion =>
      typeof item === "object" &&
      item !== null &&
      typeof item.question === "string" &&
      Array.isArray(item.options) &&
      typeof item.answerIndex === "number" &&
      typeof item.explanation === "string",
  );
}

function getChildren(
  graph: RoadmapGraph,
  nodeId: string,
): string[] {
  return graph.edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
}

export async function submitQuiz(
  userId: string,
  roadmapId: string,
  nodeId: string,
  answers: number[],
): Promise<{
  result: QuizResult;
  unlockedNodeIds: string[];
}> {
  const prisma = getPrisma();

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: {
      id: true,
      userId: true,
      title: true,
      totalHours: true,
      nodes: true,
      edges: true,
    },
  });

  if (!roadmap) {
    throw new Error("Roadmap not found");
  }

  if (roadmap.userId !== userId) {
    throw new Error("You do not have access to this roadmap");
  }

  const quiz = await prisma.diagnosticQuiz.findFirst({
    where: { roadmapId, nodeId },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  const questions = getQuestions(quiz.questions);

  if (questions.length === 0) {
    throw new Error("Quiz contains no questions");
  }

  let correctAnswers = 0;

  questions.forEach((question, index) => {
    if (answers[index] === question.answerIndex) {
      correctAnswers++;
    }
  });

  const score = Math.round(
    (correctAnswers / questions.length) * 100,
  );

  const completed = score === 100;

  await prisma.userProgress.upsert({
    where: {
      roadmapId_nodeId_userId: {
        roadmapId,
        nodeId,
        userId,
      },
    },
    create: {
      userId,
      roadmapId,
      nodeId,
      status: completed ? "COMPLETED" : "IN_PROGRESS",
      quizScore: score,
      completedAt: completed ? new Date() : null,
    },
    update: {
      status: completed ? "COMPLETED" : "IN_PROGRESS",
      quizScore: score,
      completedAt: completed ? new Date() : null,
    },
  });

  let unlockedNodeIds: string[] = [];

  if (completed) {
    const graph: RoadmapGraph = {
      title: roadmap.title,
      totalEstimatedHours: roadmap.totalHours,
      nodes: Array.isArray(roadmap.nodes)
        ? roadmap.nodes as RoadmapGraph["nodes"]
        : [],
      edges: Array.isArray(roadmap.edges)
        ? roadmap.edges as RoadmapGraph["edges"]
        : [],
    };

    const children = getChildren(graph, nodeId);

    for (const childNodeId of children) {
      const existing = await prisma.userProgress.findUnique({
        where: {
          roadmapId_nodeId_userId: {
            roadmapId,
            nodeId: childNodeId,
            userId,
          },
        },
      });

      if (!existing) {
        await prisma.userProgress.create({
          data: {
            userId,
            roadmapId,
            nodeId: childNodeId,
            status: "PENDING",
          },
        });
      }

      unlockedNodeIds.push(childNodeId);
    }
  }

  return {
    result: {
      score,
      totalQuestions: questions.length,
      correctAnswers,
      completed,
    },
    unlockedNodeIds,
  };
}
