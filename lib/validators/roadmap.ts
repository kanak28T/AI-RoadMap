import { z } from "zod";

export const roadmapNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["standard", "milestone", "bridge"]),
  level: z.enum(["Prerequisite", "Core", "Advanced"]),
  estimatedHours: z.number().nonnegative(),
  whyRecommended: z.string().min(1),
  searchKeywords: z.array(z.string()),
  prerequisites: z.array(z.string()),
}).passthrough();

export const roadmapEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
}).passthrough();

export const roadmapGraphSchema = z.object({
  title: z.string().min(1),
  targetRole: z.string().min(1).optional(),
  totalEstimatedHours: z.number().nonnegative(),
  nodes: z.array(roadmapNodeSchema),
  edges: z.array(roadmapEdgeSchema),
}).passthrough();

export const createRoadmapSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  totalHours: z.number().nonnegative(),
  nodes: z.array(roadmapNodeSchema),
  edges: z.array(roadmapEdgeSchema),
  isPublic: z.boolean().optional().default(false),
});

export const rerouteRoadmapSchema = z.object({
  roadmapId: z.string().min(1),
  stuckNodeId: z.string().min(1),
});
