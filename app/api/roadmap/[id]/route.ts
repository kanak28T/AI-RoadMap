import { NextResponse } from "next/server";
import { getRoadmap } from "../../../../lib/services/roadmap.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const roadmap = await getRoadmap(id);

    return NextResponse.json({
      roadmapId: roadmap.id,
      title: roadmap.title,
      totalEstimatedHours: roadmap.totalHours,
      nodes: roadmap.nodes,
      edges: roadmap.edges,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Roadmap not found" ? 404 : message.includes("access") ? 403 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
