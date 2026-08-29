// POST /api/roadmap/generate
// Integrates: Kanak (DAG generation) → Reshal (resource enrichment) → Sanvi (persistence)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRoadmap } from "@/lib/ai/generate-roadmap";
import { enrichRoadmap } from "@/lib/services/enrich-roadmap";
import prisma from "@/lib/db/prisma";

const RequestSchema = z.object({
  goal: z.string().min(3),
  existingSkills: z.array(z.string()).default([]),
  weeklyHours: z.number().min(1).max(80),
  targetWeeks: z.number().min(1).max(52),
  userId: z.string().optional(),
  roadmapType: z.enum(["personalized", "course-focused"]).optional(),
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

    const { goal, existingSkills, weeklyHours, targetWeeks, userId, roadmapType } = parsed.data;

    // ── Step 1: Kanak generates the DAG ─────────────────────────────────────
    const rawRoadmap = await generateRoadmap({
      goal,
      existingSkills,
      weeklyHours,
      timelineWeeks: targetWeeks,
      roadmapType,
    });

    // ── Step 2: Reshal enriches with verified resources ──────────────────────
    const enrichedRoadmap = await enrichRoadmap(rawRoadmap);

    // ── Step 3: Sanvi persists to PostgreSQL ─────────────────────────────────
    // Resolve userId — use provided id or create a default guest user
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      // Find or create a guest user for anonymous users
      const guestUser = await prisma.user.upsert({
        where: { email: "guest@pathcraft.ai" },
        update: {},
        create: { email: "guest@pathcraft.ai", name: "Guest" },
      });
      resolvedUserId = guestUser.id;
    }

    const roadmap = await prisma.roadmap.create({
      data: {
        userId: resolvedUserId,
        title: enrichedRoadmap.title,
        goal,
        totalHours: enrichedRoadmap.totalEstimatedHours,
        nodes: enrichedRoadmap.nodes as object[],
        edges: enrichedRoadmap.edges as object[],
      },
    });

    // Create PENDING progress entries for every node
    await prisma.userProgress.createMany({
      data: enrichedRoadmap.nodes.map((node) => ({
        userId: resolvedUserId!,
        roadmapId: roadmap.id,
        nodeId: node.id,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      roadmapId: roadmap.id,
      title: roadmap.title,
      totalEstimatedHours: roadmap.totalHours,
      nodes: enrichedRoadmap.nodes.map((node) => ({
        ...node,
        status: "PENDING" as const,
        resources: node.resources ?? [],
      })),
      edges: enrichedRoadmap.edges,
    });
  } catch (err) {
    console.error("[/api/roadmap/generate]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
