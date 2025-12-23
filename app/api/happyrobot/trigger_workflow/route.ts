import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeIncidentLog } from "@/lib/incident-logger";

// Types for the workflow payload
interface FacilityPayload {
  id: string;
  name: string;
  type: string;
  resourceType: "SERVICE_CENTER" | "WAREHOUSE";
  lat: number;
  lng: number;
  distance: number;
  rank: number;
  phone: string;
}

interface DriverPayload {
  id: string;
  driverName: string;
  truckId: string;
  currentLocation: string;
  lat: number;
  lng: number;
  distance: number;
  status: "DELIVERED" | "COMPLETING";
  progress?: number;
  phone: string;
}

interface IncidentLocation {
  lat: number;
  lng: number;
  googleMapsUrl: string;
}

interface WorkflowPayload {
  incident_id: string;
  incident: {
    title: string;
    description: string | null;
    location: IncidentLocation | null;
    order: {
      id: string;
      itemName: string;
      origin: string;
      destination: string;
      sellPrice: number;
      costPrice: number;
    } | null;
  };
  facilities: FacilityPayload[];
  drivers: DriverPayload[];
  callback_url: string;
}

// POST /api/happyrobot/trigger_workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[HappyRobot] Received request body:", JSON.stringify(body, null, 2));

    const { incident_id, center_phone, trucker_phone } = body as {
      incident_id: string;
      center_phone?: string;
      trucker_phone?: string;
    };

    console.log("[HappyRobot] Parsed incident_id:", incident_id);

    if (!incident_id) {
      console.error("[HappyRobot] 400 Error: incident_id is missing");
      return NextResponse.json(
        { error: "incident_id is required" },
        { status: 400 }
      );
    }

    // Fetch incident with order and discovered candidates
    const incident = await prisma.incident.findUnique({
      where: { id: incident_id },
      include: {
        order: true,
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
      console.error("[HappyRobot] 404 Error: Incident not found for id:", incident_id);
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    console.log("[HappyRobot] Found incident:", {
      id: incident.id,
      title: incident.title,
      discoveryStatus: incident.discoveryStatus,
      candidatesCount: incident.candidates?.length || 0,
    });

    // Block if discovery isn't complete - client should wait for discovery-complete Pusher event
    if (incident.discoveryStatus !== "COMPLETED") {
      console.error("[HappyRobot] 400 Error: Discovery not completed. Current status:", incident.discoveryStatus);
      return NextResponse.json(
        { error: `Discovery not completed yet. Current status: ${incident.discoveryStatus}` },
        { status: 400 }
      );
    }

    // Build facilities array from candidates
    console.log("[HappyRobot] Building payload from candidates:",
      incident.candidates.map((c: { candidateType: string; serviceCenterId?: string | null; warehouseId?: string | null; truckId?: string | null }) =>
        ({ type: c.candidateType, id: c.serviceCenterId || c.warehouseId || c.truckId })
      )
    );

    const facilities: FacilityPayload[] = [];
    for (const c of incident.candidates) {
      if (c.candidateType === "SERVICE_CENTER" && c.serviceCenter) {
        facilities.push({
          id: c.serviceCenter.id,
          name: c.serviceCenter.name,
          type: c.serviceCenter.type,
          resourceType: "SERVICE_CENTER",
          lat: c.serviceCenter.lat,
          lng: c.serviceCenter.lng,
          distance: c.distance,
          rank: c.rank,
          phone: center_phone || "",
        });
      } else if (c.candidateType === "WAREHOUSE" && c.warehouse) {
        facilities.push({
          id: c.warehouse.id,
          name: c.warehouse.name,
          type: c.warehouse.type,
          resourceType: "WAREHOUSE",
          lat: c.warehouse.lat,
          lng: c.warehouse.lng,
          distance: c.distance,
          rank: c.rank,
          phone: center_phone || "",
        });
      }
    }

    // Build drivers array from candidates
    const drivers: DriverPayload[] = [];
    for (const c of incident.candidates) {
      if (c.candidateType === "DRIVER" && c.truck) {
        drivers.push({
          id: c.truck.id,
          driverName: c.truck.driverName,
          truckId: c.truck.id,
          currentLocation: c.currentLocation || "",
          lat: c.lat || 0,
          lng: c.lng || 0,
          distance: c.distance,
          status: (c.status as "DELIVERED" | "COMPLETING") || "COMPLETING",
          progress: c.progress || undefined,
          phone: trucker_phone || "",
        });
      }
    }

    // Build callback URL (use request origin or env var)
    const appOrigin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const callback_url = `${appOrigin}/api/webhooks/agent-log`;

    // Calculate incident location (where the truck got stuck)
    let incidentLocation: IncidentLocation | null = null;
    if (incident.order) {
      const order = incident.order;
      const progress = order.progress ?? 50;
      const routePoints = order.routeGeoJson as number[][] | null;

      let truckLat: number, truckLng: number;

      if (routePoints && routePoints.length > 0) {
        // Interpolate position along route based on progress
        const pointIndex = Math.floor((progress / 100) * (routePoints.length - 1));
        const point = routePoints[Math.min(pointIndex, routePoints.length - 1)];
        truckLng = point[0];
        truckLat = point[1];
      } else {
        // Fallback: interpolate between start and end
        truckLat = order.startLat + (order.endLat - order.startLat) * (progress / 100);
        truckLng = order.startLng + (order.endLng - order.startLng) * (progress / 100);
      }

      incidentLocation = {
        lat: truckLat,
        lng: truckLng,
        googleMapsUrl: `https://www.google.com/maps?q=${truckLat},${truckLng}`,
      };
    }

    // Construct the workflow payload
    const payload: WorkflowPayload = {
      incident_id: incident.id,
      incident: {
        title: incident.title,
        description: incident.description,
        location: incidentLocation,
        order: incident.order ? {
          id: incident.order.id,
          itemName: incident.order.itemName,
          origin: incident.order.origin,
          destination: incident.order.destination,
          sellPrice: incident.order.sellPrice,
          costPrice: incident.order.costPrice,
        } : null,
      },
      facilities,
      drivers,
      callback_url,
    };

    // Get HappyRobot webhook URL from env
    const webhookUrl = process.env.HAPPYROBOT_WEBHOOK_URL;
    const apiKey = process.env.WEBHOOK_API_KEY;

    if (!webhookUrl) {
      console.error("[HappyRobot] HAPPYROBOT_WEBHOOK_URL not configured");
      return NextResponse.json(
        { error: "Webhook URL not configured" },
        { status: 500 }
      );
    }

    // Log that we're triggering the workflow
    await writeIncidentLog(
      incident_id,
      "Activating HappyRobot AI Agent...",
      "ORCHESTRATOR",
      "INFO"
    );

    // Send POST to HappyRobot
    console.log(`[HappyRobot] Triggering workflow for incident ${incident_id}`);
    console.log(`[HappyRobot] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "X-API-KEY": apiKey }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HappyRobot] Webhook failed: ${response.status} - ${errorText}`);

      await writeIncidentLog(
        incident_id,
        `Failed to activate AI agents: ${response.status}`,
        "ORCHESTRATOR",
        "ERROR"
      );

      return NextResponse.json(
        { error: `Webhook failed: ${response.status}` },
        { status: 502 }
      );
    }

    // Parse HappyRobot response to get queued run IDs
    const happyRobotResponse = await response.json() as {
      queued_run_ids?: string[];
      status?: string;
    };

    console.log(`[HappyRobot] Response:`, happyRobotResponse);

    // Create AgentRun records for each queued run
    const createdAgents: Array<{ run_id: string; agent_role: string }> = [];

    if (happyRobotResponse.queued_run_ids && happyRobotResponse.queued_run_ids.length > 0) {
      for (let i = 0; i < happyRobotResponse.queued_run_ids.length; i++) {
        const runId = happyRobotResponse.queued_run_ids[i];

        // Determine agent role based on index (first is facility, second is driver if exists)
        // This matches HappyRobot's parallel sequence structure
        const agentRole = i === 0 ? "Facility_Voice" : "Driver_Voice";
        const agentName = i === 0 ? "HappyRobot Run" : `HappyRobot Run ${i + 1}`;
        const summary = i === 0
          ? `Coordinating with ${facilities.length} service centers/warehouses`
          : `Coordinating with ${drivers.length} available drivers`;

        try {
          await prisma.agentRun.create({
            data: {
              runId: runId,
              incidentId: incident_id,
              agentRole: agentRole,
              agentName: agentName,
              summary: summary,
              status: "RUNNING",
              logs: [],
            },
          });

          createdAgents.push({ run_id: runId, agent_role: agentRole });
          console.log(`[HappyRobot] Created AgentRun for ${agentRole}: ${runId}`);
        } catch (dbError) {
          console.error(`[HappyRobot] Failed to create AgentRun for ${runId}:`, dbError);
        }
      }
    }

    // Log success
    await writeIncidentLog(
      incident_id,
      `AI Agent activated. ${facilities.length} facilities and ${drivers.length} drivers queued for contact.`,
      "ORCHESTRATOR",
      "SUCCESS"
    );

    console.log(`[HappyRobot] Workflow triggered successfully for incident ${incident_id}`);

    return NextResponse.json({
      success: true,
      facilities_count: facilities.length,
      drivers_count: drivers.length,
      queued_run_ids: happyRobotResponse.queued_run_ids || [],
      agents: createdAgents,
    });
  } catch (error) {
    console.error("[HappyRobot] Error triggering workflow:", error);
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
