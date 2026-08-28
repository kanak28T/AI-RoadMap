// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – POST /api/roadmap/reroute
//
// Injects 1-2 remedial "bridge" nodes for a stuck learner and persists the
// updated graph using Sanvi's roadmap service.
//
// Body: { roadmapId, stuckNodeId, userProblemContext?, userId? }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { rerouteRoadmap } from "@/lib/ai/reroute-roadmap";
import type { GeneratedRoadmap, AIRoadmapNode, AIRoadmapEdge } from "@/lib/ai/generate-roadmap";
import { getRoadmap, updateRoadmapGraph } from "@/lib/services/roadmap.service";

// ── Request body ──────────────────────────────────────────────────────────────

interface RerouteRoadmapBody {
  roadmapId: string;
  stuckNodeId: string;
  userProblemContext?: string;
  userId?: string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse & validate
  let body: RerouteRoadmapBody;
  try {
    body = (await req.json()) as RerouteRoadmapBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roadmapId, stuckNodeId, userProblemContext, userId } = body;

  if (!roadmapId || !stuckNodeId) {
    return NextResponse.json(
      { error: "Missing required fields: roadmapId, stuckNodeId" },
      { status: 400 }
    );
  }

  // 2. Fetch existing roadmap from DB
  let storedRoadmap;
  try {
    storedRoadmap = await getRoadmap(roadmapId, userId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch roadmap.";
    const status = message.includes("not found") ? 404
      : message.includes("access") ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // 3. Reconstruct GeneratedRoadmap shape for the AI engine
  //    Nodes stored in DB carry AI metadata via open index signature.
  const currentGraph: GeneratedRoadmap = {
    title: storedRoadmap.title,
    targetRole: storedRoadmap.goal,
    totalEstimatedHours: storedRoadmap.totalHours,
    nodes: (storedRoadmap.nodes as AIRoadmapNode[]) ?? [],
    edges: (storedRoadmap.edges as AIRoadmapEdge[]) ?? [],
  };

  // 4. Generate updated DAG with bridge nodes via LLM
  let updatedGraph: GeneratedRoadmap;
  try {
    updatedGraph = await rerouteRoadmap({ currentGraph, stuckNodeId, userProblemContext });
  } catch (err) {
    console.error("[reroute] rerouteRoadmap error:", err);
    return NextResponse.json(
      { error: "Failed to generate bridge nodes. Please try again." },
      { status: 502 }
    );
  }

  // 5. Persist updated graph via Sanvi's updateRoadmapGraph service
  try {
    await updateRoadmapGraph(
      roadmapId,
      { nodes: updatedGraph.nodes, edges: updatedGraph.edges },
      userId
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save updated roadmap.";
    const status = message.includes("not found") ? 404
      : message.includes("access") ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // 6. Identify new bridge nodes and their rewired edges for the response
  const originalNodeIds = new Set(currentGraph.nodes.map((n) => n.id));
  const newNodes = updatedGraph.nodes.filter(
    (n) => (n as AIRoadmapNode).type === "bridge" && !originalNodeIds.has(n.id)
  );
  const bridgeIds = new Set(newNodes.map((n) => n.id));
  const updatedEdges = updatedGraph.edges.filter(
    (e) => bridgeIds.has(e.source) || bridgeIds.has(e.target)
  );

  return NextResponse.json(
    {
      success: true,
      newNodes,
      updatedEdges,
      message: "Added prerequisite bridge topics",
    },
    { status: 200 }
  );
}
