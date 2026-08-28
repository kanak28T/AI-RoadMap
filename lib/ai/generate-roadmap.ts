// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Generation
//
// Generates a personalised, topologically valid DAG via Groq / Llama 3.3.
// The returned GeneratedRoadmap is a superset of Sanvi's RoadmapNode —
// AI-specific fields (type, level, estimatedHours, etc.) are carried as
// open [key: string]: unknown properties so they pass through without
// breaking her existing types.
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";

// ── Zod schemas ──────────────────────────────────────────────────────────────

const RoadmapNodeSchema = z.object({
  id: z.string().describe("Unique node id e.g. 'node-1'"),
  title: z.string().describe("Concise skill/topic title"),
  description: z.string().optional().describe("One sentence description"),
  type: z
    .enum(["standard", "milestone", "bridge"])
    .describe("Structural role in the DAG"),
  level: z
    .enum(["Prerequisite", "Core", "Advanced"])
    .describe("Curriculum difficulty tier"),
  estimatedHours: z.number().positive().describe("Hours to complete this node"),
  whyRecommended: z
    .string()
    .describe("XAI rationale linking learner background to this node"),
  searchKeywords: z
    .array(z.string())
    .length(3)
    .describe("Exactly 3 search keywords for resource discovery"),
  prerequisites: z
    .array(z.string())
    .describe("Parent node IDs; empty for root nodes"),
});

const RoadmapEdgeSchema = z.object({
  id: z.string().describe("Edge id e.g. 'edge-node1-node2'"),
  source: z.string().describe("Prerequisite node ID"),
  target: z.string().describe("Dependent node ID"),
});

const GeneratedRoadmapSchema = z.object({
  title: z.string().describe("Roadmap display title"),
  targetRole: z.string().describe("Role the learner is working towards"),
  totalEstimatedHours: z.number().positive().describe("Sum of all node hours"),
  nodes: z.array(RoadmapNodeSchema).min(4).describe("Topologically ordered nodes"),
  edges: z.array(RoadmapEdgeSchema).describe("Directed prerequisite edges — no cycles"),
});

// ── Types ────────────────────────────────────────────────────────────────────

export type AIRoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type AIRoadmapEdge = z.infer<typeof RoadmapEdgeSchema>;
export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmapSchema>;

export interface GenerateRoadmapInput {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  timelineWeeks: number;
}

// ── Main function ────────────────────────────────────────────────────────────

export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<GeneratedRoadmap> {
  const { goal, existingSkills, weeklyHours, timelineWeeks } = input;
  const totalAvailableHours = weeklyHours * timelineWeeks;
  const skillList = existingSkills.length > 0 ? existingSkills.join(", ") : "none listed";

  const systemPrompt = `You are PathCraft AI, an expert curriculum designer and learning-path architect.
Produce a personalised learning roadmap as structured JSON conforming to the schema.

Rules:
- Output a directed acyclic graph (DAG). Edges must NEVER create a cycle.
- Nodes must be topologically ordered (prerequisites before dependents).
- Total estimatedHours must not exceed ${totalAvailableHours} hours (${weeklyHours} h/week × ${timelineWeeks} weeks).
- Omit skills the learner already knows: [${skillList}].
- Include at least one "milestone" node every 4 standard nodes.
- Every node's whyRecommended must reference the learner's existing skills or target role.
- Every node needs exactly 3 searchKeywords for a learning-resource search engine.
- Edge IDs follow the pattern "edge-<source>-<target>".
- Node IDs are stable slugs: "node-1", "node-2", etc.`;

  const userPrompt = `Goal: ${goal}
Existing skills: ${skillList}
Available time: ${weeklyHours} hours/week for ${timelineWeeks} weeks (${totalAvailableHours} total hours)

Generate a complete, actionable learning roadmap.`;

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: GeneratedRoadmapSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Recompute total from actual nodes to guard against model drift
  const derivedTotal = object.nodes.reduce((sum, n) => sum + n.estimatedHours, 0);
  return { ...object, totalEstimatedHours: derivedTotal };
}
