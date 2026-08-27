import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Roadmap generation API not implemented yet",
    },
    { status: 501 }
  );
}