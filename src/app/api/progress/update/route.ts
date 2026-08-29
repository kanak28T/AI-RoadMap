// POST /api/progress/update  (Sanvi's layer)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import type { NodeStatus, RoadmapNode } from "@/types";

const RequestSchema = z.object({
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
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

    // Resolve userId — fall back to guest
    const resolvedUserId =
      userId ??
      (await prisma.user.findUnique({ where: { email: "guest@pathcraft.ai" } }))
        ?.id;

    if (!resolvedUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify roadmap exists and belongs to user
    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Upsert progress record
    await prisma.userProgress.upsert({
      where: {
        roadmapId_nodeId_userId: { roadmapId, nodeId, userId: resolvedUserId },
      },
      create: {
        userId: resolvedUserId,
        roadmapId,
        nodeId,
        status: status as NodeStatus,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      update: {
        status: status as NodeStatus,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    // Recalculate progress metrics
    const allProgress = await prisma.userProgress.findMany({
      where: { roadmapId, userId: resolvedUserId },
      select: { nodeId: true, status: true },
    });

    const allNodes = roadmap.nodes as unknown as RoadmapNode[];
    const totalNodes = allNodes.length;
    const completedIds = new Set(
      allProgress.filter((p) => p.status === "COMPLETED").map((p) => p.nodeId)
    );
    const completedCount = completedIds.size;
    const completionPercentage =
      totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

    // Milestones at 25 / 50 / 75 / 100 %
    const milestonesReached = [25, 50, 75, 100].filter(
      (m) => completionPercentage >= m
    ).length;

    // Nodes whose every prerequisite is now completed
    const unlockedNodes = allNodes
      .filter(
        (n) =>
          !completedIds.has(n.id) &&
          n.prerequisites.every((prereqId) => completedIds.has(prereqId))
      )
      .map((n) => n.id);

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
