export type ProgressStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "STUCK";

export interface RoadmapNode {
  id: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface RoadmapEdge {
  id?: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface RoadmapGraph {
  nodes: RoadmapNode[];
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
