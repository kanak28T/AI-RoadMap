import { NextResponse } from "next/server";
import { z } from "zod";
import { rerouteRoadmap } from "../../../../lib/ai/reroute-roadmap";
import { discoverResources } from "../../../../lib/services/resource-discovery";
import { getRoadmapGraph, updateRoadmapGraph } from "../../../../lib/services/roadmap.service";
import type { RoadmapNode } from "../../../../types/roadmap";

const rerouteSchema = z.object({
  roadmapId: z.string().min(1),
  stuckNodeId: z.string().min(1),
  userProblemContext: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = rerouteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const currentGraph = await getRoadmapGraph(
  data.roadmapId,
  data.userId,
);

const currentGraphForAI = {
  title: currentGraph.title,
  targetRole: currentGraph.targetRole,
  totalEstimatedHours: currentGraph.totalEstimatedHours,
  nodes: currentGraph.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    description: String(node.description ?? ""),
    type: node.type,
    level: node.level,
    estimatedHours: Number(node.estimatedHours),
    whyRecommended: String(node.whyRecommended ?? ""),
    searchKeywords: Array.isArray(node.searchKeywords)
      ? node.searchKeywords.map(String)
      : [],
    prerequisites: Array.isArray(node.prerequisites)
      ? node.prerequisites.map(String)
      : [],
  })),
  edges: currentGraph.edges.map((edge, index) => ({
    id: edge.id ?? `edge-${index}`,
    source: edge.source,
    target: edge.target,
  })),
};


const updatedGraph = await rerouteRoadmap({
  currentGraph: currentGraphForAI,
  stuckNodeId: data.stuckNodeId,
  userProblemContext: data.userProblemContext,
});
    const originalNodeIds = new Set(currentGraph.nodes.map((node) => node.id));
    const newNodes = updatedGraph.nodes.filter(
  (node) =>
    node.type === "bridge" && !originalNodeIds.has(node.id),
);
    const enriched = new Map<string, RoadmapNode>();

    for (const node of newNodes) {
      enriched.set(node.id, {
        ...node,
        resources: await discoverResources(node.searchKeywords),
      });
    }

    const finalGraph = {
  title: updatedGraph.title,
  targetRole: updatedGraph.targetRole,
  totalEstimatedHours: updatedGraph.totalEstimatedHours,

  nodes: updatedGraph.nodes.map((node) => ({
    ...node,
    description: String(node.description ?? ""),
    resources:
      enriched.get(node.id)?.resources ?? [],
  })),

  edges: updatedGraph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  })),
};
    await updateRoadmapGraph(data.roadmapId, finalGraph, data.userId);

    const bridgeIds = new Set(newNodes.map((node) => node.id));
    const updatedEdges = finalGraph.edges.filter(
      (edge) => bridgeIds.has(edge.source) || bridgeIds.has(edge.target),
    );

    return NextResponse.json({ success: true, newNodes, updatedEdges });
  } catch (error) {
    console.error("Roadmap reroute error:", error);
    const message = error instanceof Error ? error.message : "Failed to reroute roadmap";
    const status = message === "Roadmap not found" ? 404 : message.includes("access") ? 403 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
