// PathCraft AI – Unified types (aligned with Kanak, Reshal, and Sanvi's schemas)

export type NodeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "STUCK";
export type NodeType = "standard" | "milestone" | "bridge";
export type NodeLevel = "Prerequisite" | "Core" | "Advanced";
export type ResourceSource = "Official Docs" | "YouTube" | "GitHub" | "Article";
export type ResourceType = "Video" | "Article" | "Repo";

// Reshal's verified resource shape
export interface Resource {
  title: string;
  url: string;
  source: ResourceSource;
  type: ResourceType;
  isVerified: boolean;
  duration?: string;
}

// Kanak's node shape + Sanvi's status + Reshal's resources
export interface RoadmapNode {
  id: string;
  title: string;
  type: NodeType;
  level: NodeLevel;
  estimatedHours: number;
  whyRecommended: string;
  searchKeywords: string[];
  prerequisites: string[];
  // Added at frontend (from Sanvi's UserProgress)
  status: NodeStatus;
  // Added by Reshal's enrichment
  resources: Resource[];
}

// Kanak's edge shape (id is required — "edge-node1-node2")
export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface DiagnosticQuiz {
  nodeId: string;
  questions: QuizQuestion[];
}

// ── API Types ─────────────────────────────────────────────────────────────────

export interface GenerateRoadmapRequest {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  targetWeeks: number;
  userId?: string;
}

export interface GenerateRoadmapResponse {
  roadmapId: string;
  title: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

export interface UpdateProgressRequest {
  roadmapId: string;
  nodeId: string;
  status: NodeStatus;
  userId?: string;
}

export interface UpdateProgressResponse {
  success: boolean;
  completionPercentage: number;
  milestonesReached: number;
  unlockedNodes: string[];
}

export interface RerouteRequest {
  roadmapId: string;
  stuckNodeId: string;
  userProblemContext?: string;
  userId?: string;
}

export interface RerouteResponse {
  success: boolean;
  newNodes: RoadmapNode[];
  updatedEdges: RoadmapEdge[];
  message: string;
}

export interface QuizSubmissionRequest {
  roadmapId: string;
  nodeId: string;
  answers: number[];
  userId?: string;
}

export interface QuizSubmissionResponse {
  score: number;
  passed: boolean;
  explanations: string[];
  autoCompleted: boolean;
}

// React Flow extended node data
export interface CustomNodeData extends RoadmapNode {
  onOpenDrawer: (nodeId: string) => void;
  onMarkComplete: (nodeId: string) => void;
  onMarkStuck: (nodeId: string) => void;
}
