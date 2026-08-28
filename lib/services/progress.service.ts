import { getPrisma } from "../db/prisma";
import { calculateProgress } from "../progress";
import type { ProgressStatus, RoadmapGraph } from "../../types/roadmap";

export async function updateProgress(
  userId: string,
  roadmapId: string,
  nodeId: string,
  status: ProgressStatus,
) {
  const prisma = getPrisma();

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: {
      id: true,
      userId: true,
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

  const graph: RoadmapGraph = {
    nodes: Array.isArray(roadmap.nodes)
      ? roadmap.nodes as RoadmapGraph["nodes"]
      : [],
    edges: Array.isArray(roadmap.edges)
      ? roadmap.edges as RoadmapGraph["edges"]
      : [],
  };

  const progressRecord = await prisma.userProgress.upsert({
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
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
    update: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  const allProgress = await prisma.userProgress.findMany({
    where: {
      roadmapId,
      userId,
    },
    select: {
      nodeId: true,
      status: true,
    },
  });

  const summary = calculateProgress(
    roadmapId,
    graph,
    allProgress,
  );

  return {
    progress: progressRecord,
    summary,
  };
}

export async function getProgress(
  userId: string,
  roadmapId: string,
) {
  const prisma = getPrisma();

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: {
      id: true,
      userId: true,
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

  const progress = await prisma.userProgress.findMany({
    where: {
      roadmapId,
      userId,
    },
  });

  const graph: RoadmapGraph = {
    nodes: Array.isArray(roadmap.nodes)
      ? roadmap.nodes as RoadmapGraph["nodes"]
      : [],
    edges: Array.isArray(roadmap.edges)
      ? roadmap.edges as RoadmapGraph["edges"]
      : [],
  };

  return calculateProgress(
    roadmapId,
    graph,
    progress,
  );
}
