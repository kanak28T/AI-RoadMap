import type { RoadmapGraph } from "../types/roadmap";
import type { ProgressSummary } from "../types/progress";

interface ProgressRecord {
  nodeId: string;
  status: string;
}

export function calculateProgress(
  roadmapId: string,
  graph: RoadmapGraph,
  progress: ProgressRecord[],
): ProgressSummary {
  const totalNodes = graph.nodes.length;

  const completedNodeIds = new Set(
    progress
      .filter((item) => item.status === "COMPLETED")
      .map((item) => item.nodeId),
  );

  const completedNodes = graph.nodes.filter((node) =>
    completedNodeIds.has(node.id),
  ).length;

  const completionPercentage =
    totalNodes === 0
      ? 0
      : Math.round((completedNodes / totalNodes) * 100);

  const milestonesReached = calculateMilestones(
    completionPercentage,
  );

  return {
    roadmapId,
    totalNodes,
    completedNodes,
    completionPercentage,
    milestonesReached,
  };
}

function calculateMilestones(
  completionPercentage: number,
): number {
  const milestones = [25, 50, 75, 100];

  return milestones.filter(
    (milestone) => completionPercentage >= milestone,
  ).length;
}
