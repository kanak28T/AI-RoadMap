// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Roadmap Rerouting (Adaptive Bridge Injection)
//
// When a learner is stuck on a node, this module asks the LLM to generate
// 1–2 remedial "bridge" nodes and splices them between the stuck node's
// parents and the stuck node itself, producing an updated valid DAG.
// ─────────────────────────────────────────────────────────────────────────────

import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";
import type { GeneratedRoadmap, RoadmapNode, RoadmapEdge } from "../../types/roadmap";

// ── Zod schema for the bridge patch returned by the LLM ─────────────────────

const BridgeNodeSchema = z.object({
  id: z.string().describe("Unique ID for the bridge node, e.g. 'bridge-1'"),
  title: z.string().describe("Short, descriptive title for the remedial topic"),
  estimatedHours: z
    .number()
    .positive()
    .describe("Realistic hours to complete this bridge node"),
  whyRecommended: z
    .string()
    .describe(
      "One–two sentence XAI explanation of why this remedial step will unblock the learner"
    ),
  searchKeywords: z
    .array(z.string())
    .length(3)
    .describe("Exactly 3 targeted search keywords for the resource scraper"),
});

const ReroutePatchSchema = z.object({
  bridgeNodes: z
    .array(BridgeNodeSchema)
    .min(1)
    .max(2)
    .describe("1 or 2 remedial bridge nodes to inject"),
});

// ── Input type ───────────────────────────────────────────────────────────────

export interface RerouteRoadmapInput {
  /** The full current roadmap graph. */
  currentGraph: GeneratedRoadmap;
  /** ID of the node the learner is stuck on. */
  stuckNodeId: string;
  /**
   * Optional free-text description of what specifically is confusing or
   * blocking the learner (used to tailor the bridge content).
   */
  userProblemContext?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns direct parent node IDs of `nodeId` based on existing edges. */
function getParentIds(edges: RoadmapEdge[], nodeId: string): string[] {
  return edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);
}

/** Builds a unique edge ID. */
function edgeId(source: string, target: string): string {
  return `edge-${source}-${target}`;
}

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Injects 1–2 remedial "bridge" nodes between the stuck node's parents and
 * the stuck node, rewiring the DAG as:
 *
 *   ParentNode(s) → BridgeNode(s) → StuckNode
 *
 * The rest of the graph is left intact.
 */
export async function rerouteRoadmap(
  input: RerouteRoadmapInput
): Promise<GeneratedRoadmap> {
  const { currentGraph, stuckNodeId, userProblemContext } = input;

  // ── 1. Locate the stuck node ─────────────────────────────────────────────
  const stuckNode = currentGraph.nodes.find((n) => n.id === stuckNodeId);
  if (!stuckNode) {
    throw new Error(
      `rerouteRoadmap: node "${stuckNodeId}" not found in the current graph.`
    );
  }

  const parentIds = getParentIds(currentGraph.edges, stuckNodeId);

  // ── 2. Ask the LLM to generate bridge nodes ──────────────────────────────
  const systemPrompt = `You are PathCraft AI, an adaptive curriculum designer.
Your task is to generate 1–2 remedial "bridge" learning nodes that will help a learner who is stuck.

Rules:
- Each bridge node must directly address the specific gap between the parent concepts and the stuck node.
- Keep \`estimatedHours\` small (1–4 hours each) — these are targeted remedial micro-lessons.
- IDs must follow the pattern "bridge-<slug>", e.g. "bridge-async-basics".
- Provide exactly 3 \`searchKeywords\` per node.
- \`whyRecommended\` must explain how this bridge node resolves the learner's specific blocker.`;

  const parentTitles = parentIds
    .map((id) => currentGraph.nodes.find((n) => n.id === id)?.title ?? id)
    .join(", ");

  const userPrompt = `The learner is stuck on: "${stuckNode.title}" (level: ${stuckNode.level})
Parent concepts already covered: ${parentTitles || "none (root node)"}
${userProblemContext ? `Learner's problem description: "${userProblemContext}"` : ""}

Generate 1–2 bridge nodes to scaffold the gap.`;

  const { object: patch } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: ReroutePatchSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // ── 3. Build full RoadmapNode objects for each bridge node ───────────────
  const bridgeNodes: RoadmapNode[] = patch.bridgeNodes.map((b, index) => ({
    id: b.id,
    title: b.title,
    type: "bridge" as const,
    level: stuckNode.level, // inherit level from stuck node
    estimatedHours: b.estimatedHours,
    whyRecommended: b.whyRecommended,
    searchKeywords: b.searchKeywords,
    // First bridge: parents are the stuck node's parents
    // Subsequent bridges: parent is the previous bridge
    prerequisites:
      index === 0
        ? parentIds
        : [patch.bridgeNodes[index - 1].id],
  }));

  // ── 4. Rewire edges ───────────────────────────────────────────────────────
  // Remove existing edges that point directly into the stuck node from its parents
  const removedEdgeIds = new Set(
    currentGraph.edges
      .filter(
        (e) => e.target === stuckNodeId && parentIds.includes(e.source)
      )
      .map((e) => e.id)
  );

  const retainedEdges = currentGraph.edges.filter(
    (e) => !removedEdgeIds.has(e.id)
  );

  // Edges: parents → first bridge
  const newEdges: RoadmapEdge[] = [];

  if (bridgeNodes.length === 1) {
    // parents → bridge → stuck
    for (const parentId of parentIds) {
      newEdges.push({
        id: edgeId(parentId, bridgeNodes[0].id),
        source: parentId,
        target: bridgeNodes[0].id,
      });
    }
    newEdges.push({
      id: edgeId(bridgeNodes[0].id, stuckNodeId),
      source: bridgeNodes[0].id,
      target: stuckNodeId,
    });
  } else {
    // parents → bridge[0] → bridge[1] → stuck
    for (const parentId of parentIds) {
      newEdges.push({
        id: edgeId(parentId, bridgeNodes[0].id),
        source: parentId,
        target: bridgeNodes[0].id,
      });
    }
    newEdges.push({
      id: edgeId(bridgeNodes[0].id, bridgeNodes[1].id),
      source: bridgeNodes[0].id,
      target: bridgeNodes[1].id,
    });
    newEdges.push({
      id: edgeId(bridgeNodes[1].id, stuckNodeId),
      source: bridgeNodes[1].id,
      target: stuckNodeId,
    });
  }

  // Update stuck node's prerequisites to point to the last bridge node
  const lastBridgeId = bridgeNodes[bridgeNodes.length - 1].id;
  const updatedNodes: RoadmapNode[] = currentGraph.nodes.map((node) => {
    if (node.id !== stuckNodeId) return node;
    return {
      ...node,
      prerequisites: [
        // Keep non-parent prerequisites intact, replace parent prereqs with bridge
        ...node.prerequisites.filter((p) => !parentIds.includes(p)),
        lastBridgeId,
      ],
    };
  });

  // Insert bridge nodes just before the stuck node in the array
  const stuckIndex = updatedNodes.findIndex((n) => n.id === stuckNodeId);
  const nodesWithBridges = [
    ...updatedNodes.slice(0, stuckIndex),
    ...bridgeNodes,
    ...updatedNodes.slice(stuckIndex),
  ];

  // ── 5. Recalculate total hours ────────────────────────────────────────────
  const totalEstimatedHours = nodesWithBridges.reduce(
    (sum, n) => sum + n.estimatedHours,
    0
  );

  return {
    ...currentGraph,
    nodes: nodesWithBridges,
    edges: [...retainedEdges, ...newEdges],
    totalEstimatedHours,
  };
}
