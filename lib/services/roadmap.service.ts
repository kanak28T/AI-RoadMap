import { getPrisma } from "../db/prisma";
import type {
  CreateRoadmapInput,
  RoadmapGraph,
} from "../../types/roadmap";

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function createRoadmap(input: CreateRoadmapInput) {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return prisma.roadmap.create({
    data: {
      userId: input.userId,
      title: input.title,
      goal: input.goal,
      totalHours: input.totalHours,
      nodes: toJson(input.nodes),
      edges: toJson(input.edges),
      isPublic: input.isPublic ?? false,
    },
  });
}

export async function getRoadmap(
  roadmapId: string,
  userId?: string,
) {
  const prisma = getPrisma();

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    include: {
      progress: true,
    },
  });

  if (!roadmap) {
    throw new Error("Roadmap not found");
  }

  if (userId && roadmap.userId !== userId) {
    throw new Error("You do not have access to this roadmap");
  }

  return roadmap;
}

export async function updateRoadmapGraph(
  roadmapId: string,
  graph: RoadmapGraph,
  userId?: string,
) {
  const prisma = getPrisma();

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!roadmap) {
    throw new Error("Roadmap not found");
  }

  if (userId && roadmap.userId !== userId) {
    throw new Error("You do not have access to this roadmap");
  }

  return prisma.roadmap.update({
    where: { id: roadmapId },
    data: {
      nodes: toJson(graph.nodes),
      edges: toJson(graph.edges),
    },
  });
}

export async function deleteRoadmap(
  roadmapId: string,
  userId: string,
) {
  const prisma = getPrisma();

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!roadmap) {
    throw new Error("Roadmap not found");
  }

  if (roadmap.userId !== userId) {
    throw new Error("You do not have access to this roadmap");
  }

  return prisma.roadmap.delete({
    where: { id: roadmapId },
  });
}
