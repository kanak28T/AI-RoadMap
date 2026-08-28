// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – POST /api/roadmap/reroute
//
// When a learner is stuck on a node, this endpoint injects 1-2 remedial
// "bridge" nodes into the existing roadmap DAG and enriches only those new
// nodes with scraped resources before persisting the updated graph.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { rerouteRoadmap } from "@/lib/ai/reroute-roadmap";
import { discoverResources } from "@/lib/services/resource-discovery";
import {
  getRoadmap,
  updateRoadmapGraph,
} from "@/lib/services/roadmap.service";
import type { RoadmapNode } from "@/types/roadmap";

// ── Request body shape ────────────────────────────────────────────────────────

interface RerouteRoadmapBody {
  roadmapId: string;
  stuckNodeId: string;
  userProblemContext?: string;
  userId?: string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parse & validate body ────────────────────────────────────────────
  let body: RerouteRoadmapBody;
  try {
    body = (await req.json()) as RerouteRoadmapBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roadmapId, stuckNodeId, userProblemContext } = body;

  if (!roadmapId || !stuckNodeId) {
    return NextResponse.json(
      { error: "Missing required fields: roadmapId, stuckNodeId" },
      { status: 400 }
    );
  }

  // ── 2. Fetch existing roadmap ────────────────────────────────────────────
  let currentGraph;
  try {
    currentGraph = await getRoadmap(roadmapId);
  } catch (err) {
    console.error("[reroute] getRoadmap error:", err);
    return NextResponse.json(
      { error: "Failed to fetch roadmap." },
      { status: 500 }
    );
  }

  if (!currentGraph) {
    return NextResponse.json(
      { error: `Roadmap "${roadmapId}" not found.` },
      { status: 404 }
    );
  }

  // ── 3. Generate updated DAG with bridge nodes via LLM ───────────────────
  let updatedGraph;
  try {
    updatedGraph = await rerouteRoadmap({
      currentGraph,
      stuckNodeId,
      userProblemContext,
    });
  } catch (err) {
    console.error("[reroute] rerouteRoadmap error:", err);
    return NextResponse.json(
      { error: "Failed to generate bridge nodes. Please try again." },
      { status: 502 }
    );
  }

  // ── 4. Identify newly injected bridge nodes ──────────────────────────────
  const originalNodeIds = new Set(currentGraph.nodes.map((n) => n.id));
  const newBridgeNodes: RoadmapNode[] = updatedGraph.nodes.filter(
    (n) => n.type === "bridge" && !originalNodeIds.has(n.id)
  );

  // ── 5. Enrich only the new bridge nodes with scraped resources ───────────
  const enrichedBridgeMap = new Map<string, RoadmapNode>();
  for (const bridge of newBridgeNodes) {
    try {
      const resources = await discoverResources(bridge.searchKeywords);
      enrichedBridgeMap.set(bridge.id, { ...bridge, resources } as RoadmapNode);
    } catch (err) {
      // Non-fatal — keep the plain bridge node if scraper fails.
      console.warn(
        `[reroute] discoverResources failed for bridge "${bridge.id}":`,
        err
      );
      enrichedBridgeMap.set(bridge.id, bridge);
    }
  }

  // Merge enriched bridges back into the updated graph.
  const finalGraph = {
    ...updatedGraph,
    nodes: updatedGraph.nodes.map((n) => enrichedBridgeMap.get(n.id) ?? n),
  };

  // ── 6. Persist updated graph ─────────────────────────────────────────────
  try {
    await updateRoadmapGraph(roadmapId, finalGraph);
  } catch (err) {
    console.error("[reroute] updateRoadmapGraph error:", err);
    return NextResponse.json(
      { error: "Failed to save updated roadmap." },
      { status: 500 }
    );
  }

  // ── 7. Identify edges that involve the new bridge nodes ──────────────────
  const bridgeIds = new Set(newBridgeNodes.map((n) => n.id));
  const updatedEdges = finalGraph.edges.filter(
    (e) => bridgeIds.has(e.source) || bridgeIds.has(e.target)
  );

  // ── 8. Return ────────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      success: true,
      newNodes: newBridgeNodes,
      updatedEdges,
      message: "Added prerequisite bridge topics",
    },
    { status: 200 }
  );
}
