// POST /api/roadmap/reroute
// Integrates: Kanak (bridge generation) → Reshal (resource enrichment) → Sanvi (persistence)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rerouteRoadmap } from "@/lib/ai/reroute-roadmap";
import { discoverResources } from "@/lib/services/resource-discovery";
import prisma from "@/lib/db/prisma";
import type { GeneratedRoadmap } from "@/lib/ai/generate-roadmap";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  roadmapId: z.string().min(1),
  stuckNodeId: z.string().optional(),
  nodeId: z.string().optional(), // Fallback support for requests sending nodeId
  userProblemContext: z.string().optional(),
  issueDescription: z.string().optional(), // Fallback support for alternative naming
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

    const { roadmapId, stuckNodeId, nodeId, userProblemContext, issueDescription, userId } = parsed.data;
    const targetNodeId = stuckNodeId || nodeId;
    const problemContext = userProblemContext || issueDescription;

    if (!targetNodeId) {
      return NextResponse.json(
        { error: "stuckNodeId or nodeId is required" },
        { status: 400 }
      );
    }

    // ── 1. Fetch current roadmap from DB ────────────────────────────────────
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

    // ── 2. Kanak: generate bridge nodes ─────────────────────────────────────
    const updatedGraph = await rerouteRoadmap({
      currentGraph,
      stuckNodeId: targetNodeId,
      userProblemContext: problemContext,
    });

    // Find only the newly added bridge nodes
    const existingNodeIds = new Set(currentGraph.nodes.map((n) => n.id));
    const newBridgeNodes = updatedGraph.nodes.filter(
      (n) => !existingNodeIds.has(n.id)
    );

    // ── 3. Reshal: enrich bridge nodes with resources ────────────────────────
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

    // ── 4. Sanvi: persist updated roadmap ───────────────────────────────────
    await prisma.roadmap.update({
      where: { id: roadmapId },
      data: {
        nodes: finalGraph.nodes as object[],
        edges: finalGraph.edges as object[],
        totalHours: finalGraph.totalEstimatedHours,
      },
    });

    // ── 5. Ensure user exists & create progress entries ─────────────────────
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const guestUser = await prisma.user.upsert({
        where: { email: "guest@pathcraft.ai" },
        update: {},
        create: { email: "guest@pathcraft.ai", name: "Guest" },
      });
      resolvedUserId = guestUser.id;
    }

    if (resolvedUserId && enrichedBridgeNodes.length > 0) {
      await prisma.userProgress.createMany({
        data: enrichedBridgeNodes.map((node) => ({
          userId: resolvedUserId!,
          roadmapId,
          nodeId: node.id,
          status: "PENDING" as const,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      nodes: finalGraph.nodes,
      edges: finalGraph.edges,
      newNodes: enrichedBridgeNodes,
      updatedEdges: finalGraph.edges,
      message: `Added ${enrichedBridgeNodes.length} prerequisite bridge topic${
        enrichedBridgeNodes.length === 1 ? "" : "s"
      }`,
    });
  } catch (err) {
    console.error("[/api/roadmap/reroute]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
