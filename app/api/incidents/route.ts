import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/incidents - List all incidents
export async function GET() {
  try {
    const incidents = await prisma.incident.findMany({
      include: {
        agentRuns: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}
