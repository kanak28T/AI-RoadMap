// PathCraft AI – Re-Routing Engine (Kanak's layer)
// Ported from feature/kanak-ai-orchestration:lib/ai/reroute-roadmap.ts
import { generateObject } from "ai";
import { groq } from "./groq-client";
import { z } from "zod";
import type { GeneratedRoadmap } from "./generate-roadmap";

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
}

const BridgeNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  estimatedHours: z.number().positive(),
  whyRecommended: z.string(),
  searchKeywords: z.array(z.string()).length(3),
});

const ReroutePatchSchema = z.object({
  bridgeNodes: z.array(BridgeNodeSchema).min(1).max(2),
});

export interface RerouteRoadmapInput {
  currentGraph: GeneratedRoadmap;
  stuckNodeId: string;
  userProblemContext?: string;
}

function getParentIds(edges: RoadmapEdge[], nodeId: string): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

function edgeId(source: string, target: string): string {
  return `edge-${source}-${target}`;
}

export async function rerouteRoadmap(
  input: RerouteRoadmapInput
): Promise<GeneratedRoadmap> {
  const { currentGraph, stuckNodeId, userProblemContext } = input;

  const stuckNode = currentGraph.nodes.find((n) => n.id === stuckNodeId);
  if (!stuckNode) {
    throw new Error(`rerouteRoadmap: node "${stuckNodeId}" not found.`);
  }

  const parentIds = getParentIds(
    currentGraph.edges as RoadmapEdge[],
    stuckNodeId
  );

  const systemPrompt = `You are PathCraft AI, an adaptive curriculum designer.
Generate 1–2 remedial "bridge" learning nodes to help a stuck learner.
Rules:
- Each bridge directly addresses the gap between parent concepts and the stuck node.
- Keep estimatedHours small (1–4 hours each).
- IDs follow "bridge-<slug>".
- Provide exactly 3 searchKeywords per node.
- whyRecommended explains how this bridge resolves the blocker.`;

  const parentTitles = parentIds
    .map((id) => currentGraph.nodes.find((n) => n.id === id)?.title ?? id)
    .join(", ");

  const userPrompt = `Stuck on: "${stuckNode.title}" (level: ${stuckNode.level})
Parent concepts covered: ${parentTitles || "none"}
${userProblemContext ? `Learner's problem: "${userProblemContext}"` : ""}
Generate 1–2 bridge nodes to scaffold the gap.`;

  const { object: patch } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: ReroutePatchSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const bridgeNodes = patch.bridgeNodes.map((b, index) => ({
    id: b.id,
    title: b.title,
    type: "bridge" as const,
    level: stuckNode.level,
    estimatedHours: b.estimatedHours,
    whyRecommended: b.whyRecommended,
    searchKeywords: b.searchKeywords,
    prerequisites:
      index === 0 ? parentIds : [patch.bridgeNodes[index - 1].id],
  }));

  const currentEdges = currentGraph.edges as RoadmapEdge[];
  const removedEdgeIds = new Set(
    currentEdges
      .filter((e) => e.target === stuckNodeId && parentIds.includes(e.source))
      .map((e) => e.id)
  );
  const retainedEdges = currentEdges.filter((e) => !removedEdgeIds.has(e.id));

  const newEdges: RoadmapEdge[] = [];
  if (bridgeNodes.length === 1) {
    for (const pid of parentIds) {
      newEdges.push({ id: edgeId(pid, bridgeNodes[0].id), source: pid, target: bridgeNodes[0].id });
    }
    newEdges.push({ id: edgeId(bridgeNodes[0].id, stuckNodeId), source: bridgeNodes[0].id, target: stuckNodeId });
  } else {
    for (const pid of parentIds) {
      newEdges.push({ id: edgeId(pid, bridgeNodes[0].id), source: pid, target: bridgeNodes[0].id });
    }
    newEdges.push({ id: edgeId(bridgeNodes[0].id, bridgeNodes[1].id), source: bridgeNodes[0].id, target: bridgeNodes[1].id });
    newEdges.push({ id: edgeId(bridgeNodes[1].id, stuckNodeId), source: bridgeNodes[1].id, target: stuckNodeId });
  }

  const lastBridgeId = bridgeNodes[bridgeNodes.length - 1].id;
  const updatedNodes = currentGraph.nodes.map((node) =>
    node.id !== stuckNodeId
      ? node
      : { ...node, prerequisites: [...node.prerequisites.filter((p) => !parentIds.includes(p)), lastBridgeId] }
  );

  const stuckIndex = updatedNodes.findIndex((n) => n.id === stuckNodeId);
  const nodesWithBridges = [
    ...updatedNodes.slice(0, stuckIndex),
    ...bridgeNodes,
    ...updatedNodes.slice(stuckIndex),
  ];

  return {
    ...currentGraph,
    nodes: nodesWithBridges,
    edges: [...retainedEdges, ...newEdges] as GeneratedRoadmap["edges"],
    totalEstimatedHours: nodesWithBridges.reduce((s, n) => s + n.estimatedHours, 0),
  };
}
