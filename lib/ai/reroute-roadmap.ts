// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Rerouting (Adaptive Bridge Injection)
//
// Injects 1-2 remedial "bridge" nodes between a stuck node's parents and the
// stuck node itself, producing an updated valid DAG.
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";
import type { GeneratedRoadmap, AIRoadmapNode, AIRoadmapEdge } from "./generate-roadmap";

// ── Zod schema for the bridge patch ─────────────────────────────────────────

const BridgeNodeSchema = z.object({
  id: z.string().describe("Unique bridge node id e.g. 'bridge-async-basics'"),
  title: z.string().describe("Short descriptive title for the remedial topic"),
  description: z.string().optional(),
  estimatedHours: z.number().positive().describe("Hours to complete (1-4 hours)"),
  whyRecommended: z
    .string()
    .describe("XAI explanation of why this bridge unblocks the learner"),
  searchKeywords: z
    .array(z.string())
    .length(3)
    .describe("Exactly 3 search keywords for resource discovery"),
});

const ReroutePatchSchema = z.object({
  bridgeNodes: z.array(BridgeNodeSchema).min(1).max(2),
});

// ── Input type ───────────────────────────────────────────────────────────────

export interface RerouteRoadmapInput {
  currentGraph: GeneratedRoadmap;
  stuckNodeId: string;
  userProblemContext?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getParentIds(edges: AIRoadmapEdge[], nodeId: string): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

function makeEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}`;
}

// ── Main function ────────────────────────────────────────────────────────────

export async function rerouteRoadmap(
  input: RerouteRoadmapInput
): Promise<GeneratedRoadmap> {
  const { currentGraph, stuckNodeId, userProblemContext } = input;

  const stuckNode = currentGraph.nodes.find((n) => n.id === stuckNodeId);
  if (!stuckNode) {
    throw new Error(`rerouteRoadmap: node "${stuckNodeId}" not found.`);
  }

  const parentIds = getParentIds(currentGraph.edges, stuckNodeId);

  const parentTitles = parentIds
    .map((id) => currentGraph.nodes.find((n) => n.id === id)?.title ?? id)
    .join(", ");

  const systemPrompt = `You are PathCraft AI, an adaptive curriculum designer.
Generate 1-2 remedial "bridge" learning nodes that will unblock a stuck learner.

Rules:
- Each bridge node must directly address the gap between parent concepts and the stuck node.
- Keep estimatedHours small (1-4 hours each) — these are targeted micro-lessons.
- IDs follow the pattern "bridge-<slug>" e.g. "bridge-async-basics".
- Provide exactly 3 searchKeywords per node.
- whyRecommended must explain how this bridge resolves the specific blocker.`;

  const userPrompt = `Stuck node: "${stuckNode.title}" (level: ${stuckNode.level ?? "Core"})
Parent concepts covered: ${parentTitles || "none (root node)"}
${userProblemContext ? `Learner's problem: "${userProblemContext}"` : ""}

Generate 1-2 bridge nodes to scaffold the gap.`;

  const { object: patch } = await generateObject({
    model: groq("openai/gpt-oss-20b"),
    schema: ReroutePatchSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Build full AIRoadmapNode objects for each bridge
  const bridgeNodes: AIRoadmapNode[] = patch.bridgeNodes.map((b, index) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    type: "bridge" as const,
    level: (stuckNode.level as "Prerequisite" | "Core" | "Advanced") ?? "Core",
    estimatedHours: b.estimatedHours,
    whyRecommended: b.whyRecommended,
    searchKeywords: b.searchKeywords,
    prerequisites: index === 0 ? parentIds : [patch.bridgeNodes[index - 1].id],
  }));

  // Remove old direct edges from parents → stuck node
  const removedEdgeIds = new Set(
    currentGraph.edges
      .filter((e) => e.target === stuckNodeId && parentIds.includes(e.source))
      .map((e) => e.id)
  );
  const retainedEdges = currentGraph.edges.filter((e) => !removedEdgeIds.has(e.id));

  // Build new edges: parents → bridge(s) → stuck
  const newEdges: AIRoadmapEdge[] = [];
  if (bridgeNodes.length === 1) {
    for (const pid of parentIds) {
      newEdges.push({ id: makeEdgeId(pid, bridgeNodes[0].id), source: pid, target: bridgeNodes[0].id });
    }
    newEdges.push({ id: makeEdgeId(bridgeNodes[0].id, stuckNodeId), source: bridgeNodes[0].id, target: stuckNodeId });
  } else {
    for (const pid of parentIds) {
      newEdges.push({ id: makeEdgeId(pid, bridgeNodes[0].id), source: pid, target: bridgeNodes[0].id });
    }
    newEdges.push({ id: makeEdgeId(bridgeNodes[0].id, bridgeNodes[1].id), source: bridgeNodes[0].id, target: bridgeNodes[1].id });
    newEdges.push({ id: makeEdgeId(bridgeNodes[1].id, stuckNodeId), source: bridgeNodes[1].id, target: stuckNodeId });
  }

  const lastBridgeId = bridgeNodes[bridgeNodes.length - 1].id;

  // Update stuck node's prerequisites
  const updatedNodes: AIRoadmapNode[] = currentGraph.nodes.map((n) => {
    if (n.id !== stuckNodeId) return n;
    return {
      ...n,
      prerequisites: [
        ...(n.prerequisites ?? []).filter((p) => !parentIds.includes(p)),
        lastBridgeId,
      ],
    };
  });

  // Insert bridge nodes just before the stuck node
  const stuckIndex = updatedNodes.findIndex((n) => n.id === stuckNodeId);
  const nodesWithBridges = [
    ...updatedNodes.slice(0, stuckIndex),
    ...bridgeNodes,
    ...updatedNodes.slice(stuckIndex),
  ];

  const totalEstimatedHours = nodesWithBridges.reduce(
    (sum, n) => sum + (n.estimatedHours ?? 0),
    0
  );

  return {
    ...currentGraph,
    nodes: nodesWithBridges,
    edges: [...retainedEdges, ...newEdges],
    totalEstimatedHours,
  };
}
