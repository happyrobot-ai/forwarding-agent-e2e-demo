import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeIncidentLog, LogSource, LogStatus } from "@/lib/incident-logger";

// Valid source values for agent logs
const VALID_SOURCES: LogSource[] = [
  "ORCHESTRATOR",
  "AGENT:FACILITY",  // For service centers & warehouses
  "AGENT:DRIVER",    // For available drivers
];

// Valid status values
const VALID_STATUSES: LogStatus[] = ["INFO", "SUCCESS", "WARNING", "ERROR"];

interface AgentLogPayload {
  incident_id: string;
  message: string;
  source: LogSource;
  status?: LogStatus;
  // Optional: when a specific resource is selected/confirmed
  selected_facility_id?: string;
  selected_driver_id?: string;
}

// POST /api/webhooks/agent-log
// Receives log updates from external AI agent and writes to incident timeline
export async function POST(request: NextRequest) {
  try {
    // Validate X-API-KEY header
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      console.warn("[agent-log] Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as AgentLogPayload;
    const { incident_id, message, source, status = "INFO", selected_facility_id, selected_driver_id } = body;

    // Validate required fields
    if (!incident_id) {
      return NextResponse.json(
        { error: "incident_id is required" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!source) {
      return NextResponse.json(
        { error: "source is required" },
        { status: 400 }
      );
    }

    // Validate source value
    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify incident exists
    const incident = await prisma.incident.findUnique({
      where: { id: incident_id },
      select: { id: true, status: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Build selection metadata if provided
    const selection = (selected_facility_id || selected_driver_id)
      ? { selected_facility_id, selected_driver_id }
      : undefined;

    // Write log entry (persists to DB + broadcasts via Pusher)
    const logEntry = await writeIncidentLog(
      incident_id,
      message,
      source,
      status,
      selection
    );

    console.log(`[agent-log] Log written for incident ${incident_id}: ${message.substring(0, 50)}...`);

    return NextResponse.json({
      success: true,
      log_id: logEntry.id,
    });
  } catch (error) {
    console.error("[agent-log] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process log" },
      { status: 500 }
    );
  }
}

// GET /api/webhooks/agent-log - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/agent-log",
    method: "POST",
    required_headers: ["X-API-KEY"],
    payload: {
      incident_id: "string (required)",
      message: "string (required)",
      source: `string (required) - one of: ${VALID_SOURCES.join(", ")}`,
      status: `string (optional) - one of: ${VALID_STATUSES.join(", ")} (default: INFO)`,
      selected_facility_id: "string (optional) - ID of selected facility (filters UI to show only this one)",
      selected_driver_id: "string (optional) - ID of selected driver (filters UI to show only this one)",
    },
  });
}
