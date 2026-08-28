// Core Types for PathCraft AI

export type NodeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "STUCK";
export type NodeType = "standard" | "milestone" | "bridge";
export type NodeLevel = "Prerequisite" | "Core" | "Advanced";
export type ResourceSource = "Official Docs" | "YouTube" | "GitHub" | "Article";
export type ResourceType = "Video" | "Article" | "Repo";

export interface Resource {
  title: string;
  url: string;
  source: ResourceSource;
  type: ResourceType;
  isVerified: boolean;
  duration?: string; // e.g., "15 min" or "2h 30m"
}

export interface RoadmapNode {
  id: string; // e.g., "node_1"
  title: string; // e.g., "React Fundamentals"
  type: NodeType;
  level: NodeLevel;
  estimatedHours: number;
  whyRecommended: string; // XAI explanation
  status: NodeStatus;
  resources: Resource[];
  prerequisites: string[]; // Array of parent node IDs
}

export interface RoadmapEdge {
  source: string; // Source node ID
  target: string; // Target node ID
}

export interface QuizQuestion {
  question: string;
  options: string[]; // 4 options
  answerIndex: number; // 0-3 (correct answer)
  explanation: string;
}

export interface DiagnosticQuiz {
  nodeId: string;
  questions: QuizQuestion[];
}

// API Request/Response Types

export interface GenerateRoadmapRequest {
  userId?: string; // Optional for now
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  targetWeeks: number;
}

export interface GenerateRoadmapResponse {
  roadmapId: string;
  title: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

export interface UpdateProgressRequest {
  userId?: string;
  roadmapId: string;
  nodeId: string;
  status: NodeStatus;
}

export interface UpdateProgressResponse {
  success: boolean;
  completionPercentage: number;
  milestonesReached: number;
  unlockedNodes: string[];
}

export interface RerouteRequest {
  userId?: string;
  roadmapId: string;
  stuckNodeId: string;
  userProblemContext?: string;
}

export interface RerouteResponse {
  success: boolean;
  newNodes: RoadmapNode[];
  updatedEdges: RoadmapEdge[];
  message: string;
}

export interface QuizSubmissionRequest {
  userId?: string;
  roadmapId: string;
  nodeId: string;
  answers: number[]; // User's selected indices
}

export interface QuizSubmissionResponse {
  score: number; // 0-100
  passed: boolean; // true if 100%
  explanations: string[];
  autoCompleted: boolean; // Node marked completed
}

// React Flow Types (for canvas)
export interface CustomNodeData extends RoadmapNode {
  onOpenDrawer: (nodeId: string) => void;
  onMarkComplete: (nodeId: string) => void;
  onMarkStuck: (nodeId: string) => void;
}
