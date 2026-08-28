export type ProgressStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "STUCK";

export type RoadmapNodeType = "standard" | "milestone" | "bridge";

export type RoadmapLevel =
  | "Prerequisite"
  | "Core"
  | "Advanced";

export interface RoadmapNode {
  id: string;
  title: string;
  type: RoadmapNodeType;
  level: RoadmapLevel;
  estimatedHours: number;
  whyRecommended: string;
  searchKeywords: string[];
  prerequisites: string[];
  [key: string]: unknown;
}

export interface RoadmapEdge {
  id?: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface RoadmapGraph {
  title: string;
  targetRole?: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  [key: string]: unknown;
}

export interface GeneratedRoadmap extends RoadmapGraph {
  targetRole: string;
}

export interface DiagnosticQuiz {
  nodeId: string;
  questions: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }>;
}

export interface EnrichedRoadmapNode extends RoadmapNode {
  resources: Resource[];
}

export interface Resource {
  title: string;
  url: string;
  source: "Official Docs" | "YouTube" | "GitHub" | "Article";
  type: "Video" | "Article" | "Repo";
  isVerified: true;
}

export interface EnrichedRoadmapGraph {
  title: string;
  targetRole?: string;
  totalEstimatedHours: number;
  nodes: EnrichedRoadmapNode[];
  edges: RoadmapEdge[];
}

export interface CreateRoadmapInput {
  userId: string;
  title: string;
  goal: string;
  totalHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  isPublic?: boolean;
}

export interface RoadmapResponse {
  id: string;
  userId: string;
  title: string;
  goal: string;
  totalHours: number;
  nodes: unknown;
  edges: unknown;
  isPublic: boolean;
  createdAt: Date;
}
