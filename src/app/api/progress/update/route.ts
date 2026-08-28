// POST /api/progress/update  (Sanvi's layer)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";

const RequestSchema = z.object({
  roadmapId: z.string(),
  nodeId: z.string(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "STUCK"]),
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

    const { roadmapId, nodeId, status, userId } = parsed.data;

    // Resolve userId
    const resolvedUserId =
      userId ??
      (await prisma.user.findUnique({ where: { email: "guest@pathcraft.ai" } }))?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upsert progress record
    await prisma.userProgress.upsert({
      where: {
        roadmapId_nodeId_userId: { roadmapId, nodeId, userId: resolvedUserId },
      },
      update: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      create: {
        userId: resolvedUserId,
        roadmapId,
        nodeId,
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    // Recalculate aggregate metrics
    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const allProgress = await prisma.userProgress.findMany({
      where: { roadmapId, userId: resolvedUserId },
    });

    const totalNodes = (roadmap.nodes as unknown[]).length;
    const completedCount = allProgress.filter(
      (p: { status: string }) => p.status === "COMPLETED"
    ).length;
    const completionPercentage =
      totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

    // Count completed milestones
    const milestoneNodes = (roadmap.nodes as Array<{ id: string; type: string }>)
      .filter((n) => n.type === "milestone")
      .map((n) => n.id);
    const milestonesReached = allProgress.filter(
      (p: { status: string; nodeId: string }) =>
        p.status === "COMPLETED" && milestoneNodes.includes(p.nodeId)
    ).length;

    // Find newly unlocked nodes (all prerequisites completed)
    const completedIds = new Set(
      allProgress
        .filter((p: { status: string }) => p.status === "COMPLETED")
        .map((p: { nodeId: string }) => p.nodeId)
    );
    const allNodes = roadmap.nodes as Array<{ id: string; prerequisites: string[] }>;
    const unlockedNodes = allNodes
      .filter((node) => node.prerequisites.every((prereqId) => completedIds.has(prereqId)))
      .map((node) => node.id);

    return NextResponse.json({
      success: true,
      completionPercentage,
      milestonesReached,
      unlockedNodes,
    });
  } catch (err) {
    console.error("[/api/progress/update]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
