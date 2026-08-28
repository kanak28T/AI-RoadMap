import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRoadmap } from "../../../../lib/ai/generate-roadmap";
import { enrichRoadmap } from "../../../../lib/services/enrich-roadmap";
import { createRoadmap, upsertUser } from "../../../../lib/services/roadmap.service";

const generateRoadmapSchema = z.object({
  goal: z.string().min(1),
  existingSkills: z.array(z.string()).default([]),
  weeklyHours: z.number().positive(),
  targetWeeks: z.number().int().positive(),
  userId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = generateRoadmapSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const userId = data.userId ?? await upsertUser({
      email: "guest@pathcraft.ai",
      name: "Guest",
    });
    const generated = await generateRoadmap({
      goal: data.goal,
      existingSkills: data.existingSkills,
      weeklyHours: data.weeklyHours,
      timelineWeeks: data.targetWeeks,
    });
    const roadmap = await enrichRoadmap(generated);
    const saved = await createRoadmap({
      userId,
      title: roadmap.title,
      goal: data.goal,
      totalHours: roadmap.totalEstimatedHours,
      nodes: roadmap.nodes,
      edges: roadmap.edges,
    });

    return NextResponse.json({
      roadmapId: saved.id,
      userId,
      title: saved.title,
      totalEstimatedHours: saved.totalHours,
      nodes: saved.nodes,
      edges: saved.edges,
    });
  } catch (error) {
    console.error("Roadmap generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate roadmap" },
      { status: 502 },
    );
  }
}
