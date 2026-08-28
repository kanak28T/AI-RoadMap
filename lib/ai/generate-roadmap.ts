// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Generation
//
// Uses Vercel AI SDK `generateObject` + Zod to produce a topologically valid
// DAG from the learner's goal, existing skills, and time constraints.
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";
import type { GeneratedRoadmap } from "../../types/roadmap";

// ── Zod schemas (mirror the TypeScript interfaces for runtime validation) ────

const RoadmapNodeSchema = z.object({
  id: z.string().describe("Unique node identifier, e.g. 'node-1'"),
  title: z.string().describe("Concise skill/topic title"),
  type: z
    .enum(["standard", "milestone", "bridge"])
    .describe("Structural role in the DAG"),
  level: z
    .enum(["Prerequisite", "Core", "Advanced"])
    .describe("Curriculum difficulty tier"),
  estimatedHours: z
    .number()
    .positive()
    .describe("Realistic hours to complete this node"),
  whyRecommended: z
    .string()
    .describe(
      "One–two sentence XAI rationale linking the learner's background to this node's relevance for their target role"
    ),
  searchKeywords: z
    .array(z.string())
    .length(3)
    .describe("Exactly 3 targeted search keywords for the resource scraper"),
  prerequisites: z
    .array(z.string())
    .describe("Parent node IDs; empty array for root nodes"),
});

const RoadmapEdgeSchema = z.object({
  id: z.string().describe("Unique edge identifier, e.g. 'edge-node1-node2'"),
  source: z.string().describe("Prerequisite node ID"),
  target: z.string().describe("Dependent node ID"),
});

const GeneratedRoadmapSchema = z.object({
  title: z.string().describe("Roadmap display title"),
  targetRole: z.string().describe("The role the learner is working towards"),
  totalEstimatedHours: z
    .number()
    .positive()
    .describe("Sum of all node estimatedHours"),
  nodes: z
    .array(RoadmapNodeSchema)
    .min(4)
    .describe("Topologically ordered learning nodes"),
  edges: z
    .array(RoadmapEdgeSchema)
    .describe("Directed prerequisite edges; must form a valid DAG (no cycles)"),
});

// ── Input type ───────────────────────────────────────────────────────────────

export interface GenerateRoadmapInput {
  /** What the learner wants to achieve, e.g. "Become an ML Engineer". */
  goal: string;
  /** Skills the learner already has, e.g. ["Python", "SQL"]. */
  existingSkills: string[];
  /** Hours per week the learner can dedicate. */
  weeklyHours: number;
  /** Target timeline in weeks. */
  timelineWeeks: number;
}

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Generates a personalised, topologically valid learning roadmap DAG.
 *
 * The LLM is instructed to:
 * 1. Skip nodes the learner demonstrably already knows.
 * 2. Respect the weekly-hours × timeline budget when assigning `estimatedHours`.
 * 3. Include at least one "milestone" node every 3–5 standard nodes.
 * 4. Provide a concrete XAI rationale (`whyRecommended`) for every node.
 * 5. Guarantee the edges list forms a DAG (no circular dependencies).
 */
export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<GeneratedRoadmap> {
  const { goal, existingSkills, weeklyHours, timelineWeeks } = input;

  const totalAvailableHours = weeklyHours * timelineWeeks;
  const skillList =
    existingSkills.length > 0 ? existingSkills.join(", ") : "none listed";

  const systemPrompt = `You are PathCraft AI, an expert curriculum designer and learning-path architect.
Your task is to produce a personalised learning roadmap as a structured JSON object that strictly conforms to the provided schema.

Rules you MUST follow:
- Output a directed acyclic graph (DAG). Edges must NEVER create a cycle.
- Nodes must be ordered topologically (prerequisites before dependents).
- Total \`estimatedHours\` across all nodes must not exceed ${totalAvailableHours} hours (${weeklyHours} h/week × ${timelineWeeks} weeks).
- Omit any skill the learner already knows: [${skillList}].
- Include at least one "milestone" node for every 4 standard nodes.
- Every node's \`whyRecommended\` must explicitly reference either the learner's existing skills or their target role.
- Every node needs exactly 3 \`searchKeywords\` suitable for a learning-resource search engine.
- Edge IDs must follow the pattern "edge-<source>-<target>".
- Node IDs must be stable slugs like "node-1", "node-2", etc.`;

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

  // Derive totalEstimatedHours from actual nodes in case the LLM drifts
  const derivedTotal = object.nodes.reduce(
    (sum, node) => sum + node.estimatedHours,
    0
  );

  return {
    ...object,
    totalEstimatedHours: derivedTotal,
  } as GeneratedRoadmap;
}
