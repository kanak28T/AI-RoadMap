// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Core domain types
//
// Sanvi's original types are preserved unchanged at the top.
// Two-tier hierarchical schema (Spine / SubTopic) is appended below.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Sanvi's original types (DO NOT MODIFY)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Two-Tier Hierarchical Roadmap Schema (AI Orchestration Layer)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Zod Schemas (used at runtime by generateObject for LLM validation) ────────

export const ResourceSchema = z.object({
  title: z.string().describe("Display title of the learning resource"),
  url: z.string().url().describe("Direct URL to the resource"),
  source: z.string().describe("Source platform e.g. 'MDN', 'YouTube', 'freeCodeCamp'"),
});

export const SubTopicSchema = z.object({
  id: z.string().describe("Unique sub-topic id e.g. 'st-module1-1'"),
  title: z.string().describe("Concise micro-concept title"),
  status: z
    .enum(["pending", "in_progress", "completed"])
    .default("pending")
    .describe("Learner progress status"),
  type: z
    .enum(["recommended", "alternative", "bridge"])
    .default("recommended")
    .describe("Role of this sub-topic in the learning path"),
  isRecommended: z
    .boolean()
    .default(true)
    .describe("True if this is the primary recommended learning path"),
  isAlternative: z
    .boolean()
    .default(false)
    .describe("True if this is an alternative approach or tool"),
  estimatedHours: z
    .number()
    .positive()
    .default(2)
    .describe("Estimated hours to complete this micro-concept"),
  whyRecommended: z
    .string()
    .describe("XAI rationale: why this sub-topic matters for the learner's goal"),
  resources: z
    .array(ResourceSchema)
    .default([])
    .describe("Curated learning resources for this sub-topic"),
});

export const SpineModuleSchema = z.object({
  id: z.string().describe("Unique module id e.g. 'module-1'"),
  title: z.string().describe("Module title e.g. 'JavaScript Fundamentals'"),
  level: z
    .enum(["Prerequisite", "Core", "Advanced"])
    .describe("Curriculum difficulty tier"),
  estimatedHours: z
    .number()
    .positive()
    .describe("Total hours for all sub-topics in this module"),
  order: z
    .number()
    .int()
    .positive()
    .describe("Sequential position in the spine (1-indexed)"),
  isBridge: z
    .boolean()
    .default(false)
    .describe("True if this module is a remedial bridge inserted by the reroute engine"),
  isMilestone: z
    .boolean()
    .default(false)
    .describe("True if completing this module is a curriculum checkpoint"),
  isChoiceGroup: z
    .boolean()
    .default(false)
    .describe(
      "True if this module contains alternative tool/approach choices (e.g. React vs Vue)"
    ),
  subTopics: z
    .array(SubTopicSchema)
    .min(3)
    .max(6)
    .describe("3–6 micro-concept leaf nodes for this module"),
});

export const HierarchicalRoadmapSchema = z.object({
  title: z.string().describe("Roadmap display title"),
  targetRole: z.string().describe("Role the learner is working towards"),
  totalEstimatedHours: z
    .number()
    .positive()
    .describe("Sum of all module estimatedHours"),
  spine: z
    .array(SpineModuleSchema)
    .min(5)
    .max(7)
    .describe("5–7 sequential spine modules forming the curriculum backbone"),
});

// ── TypeScript types (derived from Zod for full type safety) ─────────────────

export type Resource = z.infer<typeof ResourceSchema>;
export type SubTopic = z.infer<typeof SubTopicSchema>;
export type SpineModule = z.infer<typeof SpineModuleSchema>;
export type HierarchicalRoadmap = z.infer<typeof HierarchicalRoadmapSchema>;
