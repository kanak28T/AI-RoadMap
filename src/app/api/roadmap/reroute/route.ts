// POST /api/roadmap/reroute
// Integrates: Kanak (bridge generation) → Reshal (resource enrichment) → Sanvi (persistence)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rerouteRoadmap } from "@/lib/ai/reroute-roadmap";
import { discoverResources } from "@/lib/services/resource-discovery";
import prisma from "@/lib/db/prisma";
import type { GeneratedRoadmap } from "@/lib/ai/generate-roadmap";

const RequestSchema = z.object({
  roadmapId: z.string(),
  stuckNodeId: z.string(),
  userProblemContext: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { roadmapId, stuckNodeId, userProblemContext, userId } = parsed.data;

    // ── Fetch current roadmap from DB ────────────────────────────────────────
    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const currentGraph: GeneratedRoadmap = {
      title: roadmap.title,
      targetRole: roadmap.goal,
      totalEstimatedHours: roadmap.totalHours,
      nodes: roadmap.nodes as GeneratedRoadmap["nodes"],
      edges: roadmap.edges as GeneratedRoadmap["edges"],
    };

    // ── Kanak: generate bridge nodes ─────────────────────────────────────────
    const updatedGraph = await rerouteRoadmap({
      currentGraph,
      stuckNodeId,
      userProblemContext,
    });

    // Find only the newly added bridge nodes
    const existingNodeIds = new Set(currentGraph.nodes.map((n) => n.id));
    const newBridgeNodes = updatedGraph.nodes.filter(
      (n) => !existingNodeIds.has(n.id)
    );

    // ── Reshal: enrich bridge nodes with resources ────────────────────────────
    const enrichedBridgeNodes = await Promise.all(
      newBridgeNodes.map(async (node) => ({
        ...node,
        resources: await discoverResources(node.searchKeywords ?? []),
      }))
    );

    // Merge enriched bridges back into updated graph
    const finalNodes = updatedGraph.nodes.map((node) => {
      const enriched = enrichedBridgeNodes.find((b) => b.id === node.id);
      return enriched ?? node;
    });
    const finalGraph = { ...updatedGraph, nodes: finalNodes };

    // ── Sanvi: persist updated roadmap ───────────────────────────────────────
    await prisma.roadmap.update({
      where: { id: roadmapId },
      data: {
        nodes: finalGraph.nodes as object[],
        edges: finalGraph.edges as object[],
        totalHours: finalGraph.totalEstimatedHours,
      },
    });

    // Create progress entries for the new bridge nodes
    const resolvedUserId = userId ?? (
      await prisma.user.findUnique({ where: { email: "guest@pathcraft.ai" } })
    )?.id;

    if (resolvedUserId) {
      await prisma.userProgress.createMany({
        data: enrichedBridgeNodes.map((node) => ({
          userId: resolvedUserId,
          roadmapId,
          nodeId: node.id,
          status: "PENDING" as const,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      newNodes: enrichedBridgeNodes,
      updatedEdges: finalGraph.edges,
      message: `Added ${enrichedBridgeNodes.length} prerequisite bridge topic${enrichedBridgeNodes.length > 1 ? "s" : ""}`,
    });
  } catch (err) {
    console.error("[/api/roadmap/reroute]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
