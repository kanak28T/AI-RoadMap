// GET /api/roadmap/:id — fetch a persisted roadmap by ID
// Used by the roadmap page on refresh to re-hydrate the Zustand store
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const roadmap = await prisma.roadmap.findUnique({ where: { id } });

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Return the same shape as POST /api/roadmap/generate
    return NextResponse.json({
      roadmapId: roadmap.id,
      title: roadmap.title,
      totalEstimatedHours: roadmap.totalHours,
      nodes: roadmap.nodes,
      edges: roadmap.edges,
      spine: Array.isArray(roadmap.nodes) ? roadmap.nodes : undefined,
    });
  } catch (err) {
    console.error("[GET /api/roadmap/:id]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
