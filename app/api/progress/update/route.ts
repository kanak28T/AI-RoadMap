import { NextResponse } from "next/server";
import { updateProgress } from "../../../../lib/services/progress.service";
import { upsertUser } from "../../../../lib/services/roadmap.service";
import { updateProgressSchema } from "../../../../lib/validators/progress";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = updateProgressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const userId = parsed.data.userId ?? await upsertUser({
      email: "guest@pathcraft.ai",
      name: "Guest",
    });
    const result = await updateProgress(
      userId,
      parsed.data.roadmapId,
      parsed.data.nodeId,
      parsed.data.status,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Progress update error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    const status =
      message === "Roadmap not found"
        ? 404
        : message.includes("access")
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
