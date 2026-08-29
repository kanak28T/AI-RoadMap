// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Generation
//
// Exports:
//   generateTwoTierRoadmap() — primary generator, produces hierarchical spine
//   convertSpineToDAG()      — adapter that flattens spine → React Flow nodes/edges
//   generateRoadmap()        — legacy flat-DAG generator (kept for reroute-roadmap.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";
import {
  HierarchicalRoadmapSchema,
  type HierarchicalRoadmap,
  type SpineModule,
  type SubTopic,
} from "../../types/roadmap";
import type { RoadmapNode, RoadmapEdge } from "../../types/roadmap";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 – Shared input type
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateRoadmapInput {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  timelineWeeks: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 – Two-Tier Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a two-tier hierarchical roadmap:
 *   Spine (5–7 modules) → SubTopics (3–6 micro-concepts each)
 *
 * Choice-group modules (isChoiceGroup: true) contain a mix of
 * isRecommended and isAlternative sub-topics so the UI can render
 * purple recommended ticks vs green alternative ticks.
 */
export async function generateTwoTierRoadmap(
  input: GenerateRoadmapInput
): Promise<HierarchicalRoadmap> {
  const { goal, existingSkills, weeklyHours, timelineWeeks } = input;
  const totalAvailableHours = weeklyHours * timelineWeeks;
  const skillList = existingSkills.length > 0 ? existingSkills.join(", ") : "none listed";

  const systemPrompt = `You are PathCraft AI, an expert curriculum architect.
Generate a two-tier hierarchical learning roadmap as structured JSON.

STRUCTURE RULES:
- Produce exactly 5–7 sequential spine modules (ordered by field 'order', starting at 1).
- Each module contains 3–6 micro-concept sub-topics (leaf nodes).
- Sub-topic IDs follow the pattern "st-<moduleId>-<index>" e.g. "st-module-1-1".
- Module IDs follow the pattern "module-<n>" e.g. "module-1".
- Total estimatedHours across all modules must not exceed ${totalAvailableHours} h.
- Skip topics the learner already knows: [${skillList}].

MODULE TYPE RULES:
- Mark modules as isMilestone: true for every 2nd–3rd module (curriculum checkpoints).
- When a module covers technology choices (e.g. "React vs Vue", "REST vs GraphQL"),
  set isChoiceGroup: true and create:
    • isRecommended: true, isAlternative: false sub-topics for the PRIMARY recommended path.
    • isRecommended: false, isAlternative: true sub-topics for the ALTERNATIVE path.
- Bridge modules (remedial catch-up) should be isBridge: true.

SUB-TOPIC RULES:
- type field: "recommended" for primary path, "alternative" for alt tools, "bridge" for remedial.
- Every sub-topic must have a whyRecommended explanation referencing the learner's goal or existing skills.
- resources array should be empty [] (will be enriched by scraper layer).
- estimatedHours per sub-topic: 1–4 hours.`;

  const userPrompt = `Learner goal: ${goal}
Existing skills: ${skillList}
Time budget: ${weeklyHours} h/week × ${timelineWeeks} weeks = ${totalAvailableHours} h total

Generate the full two-tier hierarchical roadmap now.`;

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: HierarchicalRoadmapSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Recompute totalEstimatedHours from actual modules
  const derivedTotal = object.spine.reduce((sum, m) => sum + m.estimatedHours, 0);
  return { ...object, totalEstimatedHours: derivedTotal };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 – Spine → DAG adapter  (React Flow backward-compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export interface DAGResult {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

/**
 * Flattens the two-tier spine into the flat nodes/edges format required
 * by the existing React Flow canvas and all downstream API contracts.
 *
 * Node mapping:
 *   SpineModule  → one "milestone" or "standard" node  (id = module.id)
 *   SubTopic     → one leaf node                        (id = subTopic.id)
 *
 * Edge wiring:
 *   module[n-1] → module[n]         (sequential spine edges)
 *   module[n]   → each subTopic     (parent → child edges)
 *
 * All AI metadata (type, level, estimatedHours, isChoiceGroup, isRecommended,
 * isAlternative, whyRecommended, searchKeywords) is preserved via RoadmapNode's
 * open [key: string]: unknown index so React Flow and the quiz endpoints work
 * without any changes.
 */
export function convertSpineToDAG(spine: SpineModule[]): DAGResult {
  const nodes: RoadmapNode[] = [];
  const edges: RoadmapEdge[] = [];

  // Sort spine by order field defensively
  const sorted = [...spine].sort((a, b) => a.order - b.order);

  sorted.forEach((module, moduleIndex) => {
    // ── Spine module node ──────────────────────────────────────────────────
    const moduleNode: RoadmapNode = {
      id: module.id,
      title: module.title,
      description: `Module ${module.order}: ${module.title}`,
      // AI metadata (open index)
      type: module.isMilestone ? "milestone" : module.isBridge ? "bridge" : "standard",
      level: module.level,
      estimatedHours: module.estimatedHours,
      order: module.order,
      isBridge: module.isBridge,
      isMilestone: module.isMilestone,
      isChoiceGroup: module.isChoiceGroup,
      // searchKeywords derived from sub-topic titles for the resource scraper
      searchKeywords: module.subTopics.slice(0, 3).map((st) => st.title),
      whyRecommended: module.subTopics[0]?.whyRecommended ?? "",
      prerequisites: moduleIndex === 0 ? [] : [sorted[moduleIndex - 1].id],
    };
    nodes.push(moduleNode);

    // ── Sequential spine edge: prev module → this module ──────────────────
    if (moduleIndex > 0) {
      edges.push({
        id: `edge-${sorted[moduleIndex - 1].id}-${module.id}`,
        source: sorted[moduleIndex - 1].id,
        target: module.id,
      });
    }

    // ── SubTopic leaf nodes ────────────────────────────────────────────────
    module.subTopics.forEach((st: SubTopic) => {
      const stNode: RoadmapNode = {
        id: st.id,
        title: st.title,
        description: st.whyRecommended,
        // AI metadata (open index)
        type: st.type,
        level: module.level,
        estimatedHours: st.estimatedHours,
        status: st.status,
        isRecommended: st.isRecommended,
        isAlternative: st.isAlternative,
        isChoiceGroup: module.isChoiceGroup,
        whyRecommended: st.whyRecommended,
        searchKeywords: [st.title, module.title, module.level],
        resources: st.resources,
        prerequisites: [module.id],
      };
      nodes.push(stNode);

      // module → subTopic edge
      edges.push({
        id: `edge-${module.id}-${st.id}`,
        source: module.id,
        target: st.id,
      });
    });
  });

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 – Legacy flat-DAG generator (used by reroute-roadmap.ts)
// ─────────────────────────────────────────────────────────────────────────────

// Re-export legacy Zod schemas and types so reroute-roadmap.ts continues to work

const RoadmapNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
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

export type AIRoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type AIRoadmapEdge = z.infer<typeof RoadmapEdgeSchema>;
export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmapSchema>;

export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<GeneratedRoadmap> {
  const { goal, existingSkills, weeklyHours, timelineWeeks } = input;
  const totalAvailableHours = weeklyHours * timelineWeeks;
  const skillList = existingSkills.length > 0 ? existingSkills.join(", ") : "none listed";

  const systemPrompt = `You are PathCraft AI, an expert curriculum designer.
Produce a personalised learning roadmap as structured JSON.

Rules:
- Output a directed acyclic graph (DAG). Edges must NEVER create a cycle.
- Nodes must be topologically ordered.
- Total estimatedHours must not exceed ${totalAvailableHours} hours.
- Omit skills the learner already knows: [${skillList}].
- Include at least one "milestone" node every 4 standard nodes.
- Every node's whyRecommended must reference the learner's existing skills or target role.
- Every node needs exactly 3 searchKeywords.
- Edge IDs: "edge-<source>-<target>". Node IDs: "node-1", "node-2", etc.`;

  const userPrompt = `Goal: ${goal}
Existing skills: ${skillList}
Available time: ${weeklyHours} h/week × ${timelineWeeks} weeks (${totalAvailableHours} h total)

Generate a complete, actionable learning roadmap.`;

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: GeneratedRoadmapSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const derivedTotal = object.nodes.reduce((sum, n) => sum + n.estimatedHours, 0);
  return { ...object, totalEstimatedHours: derivedTotal };
}
