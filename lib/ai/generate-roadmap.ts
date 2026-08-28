// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Generation
//
// Generates a personalised learning roadmap using Groq.
// The AI generates nodes + prerequisites.
// Edges are derived deterministically in application code.
// ─────────────────────────────────────────────────────────────────────────────

import { generateText, Output } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";

// ── Zod schemas ──────────────────────────────────────────────────────────────

const RoadmapNodeSchema = z.object({
  id: z.string().describe("Unique node id such as node-1"),

  title: z.string().describe("Concise skill or topic title"),

  description: z
    .string()
    .describe("One sentence description of what the learner will learn"),

  type: z
    .enum(["standard", "milestone", "bridge"])
    .describe("Structural role in the learning DAG"),

  level: z
    .enum(["Prerequisite", "Core", "Advanced"])
    .describe("Curriculum difficulty tier"),

  estimatedHours: z
    .number()
    .describe("Hours required to complete this node"),

  whyRecommended: z
    .string()
    .describe(
      "Explanation connecting the node to the learner's existing skills or target role",
    ),

  searchKeywords: z
    .array(z.string())
    .describe("Exactly 3 keywords for learning-resource discovery"),

  prerequisites: z
    .array(z.string())
    .describe("IDs of prerequisite nodes. Empty array for root nodes."),
});

// ── Types ────────────────────────────────────────────────────────────────────

export type AIRoadmapNode = z.infer<typeof RoadmapNodeSchema>;

export interface AIRoadmapEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

const GeneratedRoadmapSchema = z.object({
  title: z.string().describe("Roadmap display title"),

  targetRole: z
    .string()
    .describe("Role the learner is working towards"),

  totalEstimatedHours: z
    .number()
    .describe("Estimated total learning hours"),

  nodes: z
    .array(RoadmapNodeSchema)
    .describe(
      "Topologically ordered learning nodes. Prerequisites must appear before dependent nodes.",
    ),
});

// AI response before edges are added.
type GeneratedRoadmapAI = z.infer<typeof GeneratedRoadmapSchema>;

// Final roadmap used by the application.
export type GeneratedRoadmap = GeneratedRoadmapAI & {
  edges: AIRoadmapEdge[];
};

export interface GenerateRoadmapInput {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  timelineWeeks: number;
}

// ── Deterministic edge generation ────────────────────────────────────────────
//
// The AI does NOT generate edges.
//
// If node-2 has:
// prerequisites: ["node-1"]
//
// our application creates:
//
// {
//   id: "edge-node-1-node-2",
//   source: "node-1",
//   target: "node-2"
// }
//
// This avoids asking the AI to generate the same relationship twice.
// ─────────────────────────────────────────────────────────────────────────────

function deriveEdgesFromPrerequisites(
  nodes: AIRoadmapNode[],
): AIRoadmapEdge[] {
  return nodes.flatMap((node) =>
    node.prerequisites.map((prerequisiteId) => ({
      id: `edge-${prerequisiteId}-${node.id}`,
      source: prerequisiteId,
      target: node.id,
    })),
  );
}

// ── Main roadmap generation function ─────────────────────────────────────────

export async function generateRoadmap(
  input: GenerateRoadmapInput,
): Promise<GeneratedRoadmap> {
  const {
    goal,
    existingSkills,
    weeklyHours,
    timelineWeeks,
  } = input;

  const totalAvailableHours = weeklyHours * timelineWeeks;

  const skillList =
    existingSkills.length > 0
      ? existingSkills.join(", ")
      : "none listed";

  // ── System prompt ─────────────────────────────────────────────────────────

  const systemPrompt = `You are PathCraft AI, an expert curriculum designer and learning-path architect.

Create a personalised learning roadmap for the learner.

Return ONLY a JSON object matching the provided schema.

Rules:

1. Create a directed acyclic learning graph.
2. Nodes must be topologically ordered.
3. A prerequisite node MUST appear before the node that depends on it.
4. Every prerequisite must reference an existing node ID.
5. Never create a circular dependency.
6. Do NOT include skills that the learner already knows.
7. Total estimated hours must not exceed ${totalAvailableHours} hours.
8. Create at least 4 learning nodes.
9. Include milestone nodes at useful progress points.
10. Every node's whyRecommended must connect the topic to the learner's existing skills or target role.
11. Every node must contain exactly 3 search keywords.
12. Node IDs must use the format node-1, node-2, node-3, etc.
13. Use an empty prerequisites array for root nodes.
14. Do NOT generate an edges field.
15. Return only fields defined in the schema.

Learner target:
${goal}

Existing skills:
${skillList}

Available learning time:
${weeklyHours} hours per week for ${timelineWeeks} weeks.

Total available time:
${totalAvailableHours} hours.`;

// ── User prompt ─────────────────────────────────────────────────────────────

  const userPrompt = `Generate a complete and actionable learning roadmap.

Goal: ${goal}

Existing skills: ${skillList}

Weekly availability: ${weeklyHours} hours

Target duration: ${timelineWeeks} weeks

Total available time: ${totalAvailableHours} hours

The roadmap should progress from prerequisites to core skills to advanced skills and milestones.`;

// ── AI generation ──────────────────────────────────────────────────────────

  const { output } = await generateText({
    model: groq("openai/gpt-oss-20b"),

    system: systemPrompt,

    prompt: userPrompt,

    output: Output.object({
      schema: GeneratedRoadmapSchema,
      name: "learning_roadmap",
      description:
        "A personalised learning roadmap containing ordered learning nodes and their prerequisites.",
    }),

    maxRetries: 2,

    providerOptions: {
      groq: {
        structuredOutputs: true,
        strictJsonSchema: true,
        reasoningEffort: "low",
      },
    },
  });

  if (!output) {
    throw new Error("Groq did not return a roadmap.");
  }

  // ── Manual validation ────────────────────────────────────────────────────

  if (output.nodes.length < 4) {
    throw new Error("Generated roadmap must contain at least 4 nodes.");
  }

  const nodeIds = new Set(
    output.nodes.map((node) => node.id),
  );

  for (const node of output.nodes) {
    // Validate estimated hours.
    if (node.estimatedHours <= 0) {
      throw new Error(
        `Invalid estimatedHours for node "${node.id}".`,
      );
    }

    // Validate exactly 3 search keywords.
    if (node.searchKeywords.length !== 3) {
      throw new Error(
        `Node "${node.id}" must contain exactly 3 search keywords.`,
      );
    }

    // Validate prerequisite references.
    for (const prerequisiteId of node.prerequisites) {
      if (!nodeIds.has(prerequisiteId)) {
        throw new Error(
          `Invalid prerequisite "${prerequisiteId}" referenced by node "${node.id}".`,
        );
      }

      if (prerequisiteId === node.id) {
        throw new Error(
          `Node "${node.id}" cannot be its own prerequisite.`,
        );
      }
    }
  }

  // ── Derive edges locally ──────────────────────────────────────────────────

  const edges = deriveEdgesFromPrerequisites(output.nodes);

  // ── Recompute total from actual nodes ─────────────────────────────────────

  const derivedTotal = output.nodes.reduce(
    (sum, node) => sum + node.estimatedHours,
    0,
  );

  if (derivedTotal > totalAvailableHours) {
    throw new Error(
      `Generated roadmap requires ${derivedTotal} hours, exceeding the available ${totalAvailableHours} hours.`,
    );
  }

  // ── Return application-ready roadmap ──────────────────────────────────────

  return {
    ...output,
    totalEstimatedHours: derivedTotal,
    edges,
  };
}