// PathCraft AI – Progress Service (Sanvi's layer)
// Ported from feature/sanvi-backend-db:lib/services/progress.service.ts
import prisma from "@/lib/db/prisma";
import type { NodeStatus, RoadmapNode, RoadmapEdge } from "@/types";

interface RoadmapGraph {
  title: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

interface ProgressRecord {
  nodeId: string;
  status: string;
}

function calculateProgress(
  roadmapId: string,
  graph: RoadmapGraph,
  progress: ProgressRecord[]
) {
  const totalNodes = graph.nodes.length;

  const completedNodeIds = new Set(
    progress.filter((p) => p.status === "COMPLETED").map((p) => p.nodeId)
  );

  const completedNodes = graph.nodes.filter((n) =>
    completedNodeIds.has(n.id)
  ).length;

  const completionPercentage =
    totalNodes === 0 ? 0 : Math.round((completedNodes / totalNodes) * 100);

  // Milestone thresholds: 25%, 50%, 75%, 100%
  const milestonesReached = [25, 50, 75, 100].filter(
    (m) => completionPercentage >= m
  ).length;

  return {
    roadmapId,
    totalNodes,
    completedNodes,
    completionPercentage,
    milestonesReached,
  };
}

export async function updateProgress(
  userId: string,
  roadmapId: string,
  nodeId: string,
  status: NodeStatus
) {
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

  if (!roadmap) throw new Error("Roadmap not found");
  if (roadmap.userId !== userId) {
    throw new Error("You do not have access to this roadmap");
  }

  const graph: RoadmapGraph = {
    title: roadmap.title,
    totalEstimatedHours: roadmap.totalHours,
    nodes: Array.isArray(roadmap.nodes) ? (roadmap.nodes as unknown as RoadmapNode[]) : [],
    edges: Array.isArray(roadmap.edges) ? (roadmap.edges as unknown as RoadmapEdge[]) : [],
  };

  const progressRecord = await prisma.userProgress.upsert({
    where: {
      roadmapId_nodeId_userId: { roadmapId, nodeId, userId },
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
    where: { roadmapId, userId },
    select: { nodeId: true, status: true },
  });

  const summary = calculateProgress(roadmapId, graph, allProgress);

  return { progress: progressRecord, summary };
}
