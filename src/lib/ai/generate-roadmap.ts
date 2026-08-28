// PathCraft AI – Roadmap Generation (Kanak's layer)
// Ported from feature/kanak-ai-orchestration:lib/ai/generate-roadmap.ts
import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";

const RoadmapNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["standard", "milestone", "bridge"]),
  level: z.enum(["Prerequisite", "Core", "Advanced"]),
  estimatedHours: z.number().positive(),
  whyRecommended: z.string(),
  searchKeywords: z.array(z.string()).length(3),
  prerequisites: z.array(z.string()),
});

const RoadmapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

const GeneratedRoadmapSchema = z.object({
  title: z.string(),
  targetRole: z.string(),
  totalEstimatedHours: z.number().positive(),
  nodes: z.array(RoadmapNodeSchema).min(4),
  edges: z.array(RoadmapEdgeSchema),
});

export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmapSchema>;

export interface GenerateRoadmapInput {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  timelineWeeks: number;
}

export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<GeneratedRoadmap> {
  const { goal, existingSkills, weeklyHours, timelineWeeks } = input;
  const totalAvailableHours = weeklyHours * timelineWeeks;
  const skillList =
    existingSkills.length > 0 ? existingSkills.join(", ") : "none listed";

  const systemPrompt = `You are PathCraft AI, an expert curriculum designer.
Produce a personalised learning roadmap as a structured JSON object.

Rules:
- Output a directed acyclic graph (DAG). Edges must NEVER create a cycle.
- Nodes must be ordered topologically (prerequisites before dependents).
- Total estimatedHours must not exceed ${totalAvailableHours} hours.
- Omit any skill the learner already knows: [${skillList}].
- Include at least one "milestone" node for every 4 standard nodes.
- Every node's whyRecommended must reference the learner's existing skills or target role.
- Every node needs exactly 3 searchKeywords.
- Edge IDs follow "edge-<source>-<target>".
- Node IDs are stable slugs like "node-1", "node-2".`;

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

  const derivedTotal = object.nodes.reduce(
    (sum, node) => sum + node.estimatedHours,
    0
  );

  return { ...object, totalEstimatedHours: derivedTotal };
}
