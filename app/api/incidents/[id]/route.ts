import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/incidents/[id] - Get single incident with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        agentRuns: {
          orderBy: { createdAt: "asc" },
        },
        logs: {
          orderBy: { timestamp: "asc" },
        },
        order: {
          include: {
            truck: true,
            buyers: true,
          },
        },
        candidates: {
          include: {
            serviceCenter: true,
            warehouse: true,
            truck: true,
          },
          orderBy: { rank: "asc" },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}
