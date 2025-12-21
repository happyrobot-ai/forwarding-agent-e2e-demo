import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

// GET /api/incidents/[id]/logs - Get all logs for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    const logs = await prisma.incidentLog.findMany({
      where: { incidentId },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching incident logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident logs" },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/logs - Create a new log entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    const body = await request.json();

    const { message, source, status = "INFO" } = body;

    if (!message || !source) {
      return NextResponse.json(
        { error: "message and source are required" },
        { status: 400 }
      );
    }

    // 1. Write to database
    const log = await prisma.incidentLog.create({
      data: {
        incidentId,
        message,
        source,
        status,
      },
    });

    // 2. Broadcast via Pusher to all listeners
    await pusherServer.trigger("sysco-demo", "incident-log", {
      incidentId,
      log: {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        message: log.message,
        source: log.source,
        status: log.status,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating incident log:", error);
    return NextResponse.json(
      { error: "Failed to create incident log" },
      { status: 500 }
    );
  }
}
