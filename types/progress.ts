import type { ProgressStatus } from "./roadmap";

export interface UpdateProgressInput {
  userId: string;
  roadmapId: string;
  nodeId: string;
  status: ProgressStatus;
}

export interface ProgressSummary {
  roadmapId: string;
  totalNodes: number;
  completedNodes: number;
  completionPercentage: number;
  milestonesReached: number;
}
