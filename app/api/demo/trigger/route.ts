import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { writeIncidentLog } from "@/lib/incident-logger";

export async function POST(request: NextRequest) {
  try {
    // Get orderId and description from request body
    const body = await request.json().catch(() => ({}));
    const { orderId, description } = body as { orderId?: string; description?: string };

    // Clear only incident-related data (preserve background orders)
    // Note: IncidentCandidate will be cascade-deleted with incidents
    await prisma.agentRun.deleteMany();
    await prisma.incident.deleteMany();

    // Get the selected order (or use a random one if not specified)
    let targetOrder;
    if (orderId) {
      targetOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { truck: true, buyers: true },
      });

      // If specific order was requested but not found, return error (don't fall back)
      if (!targetOrder) {
        return NextResponse.json(
          { error: `Order "${orderId}" not found. Use a valid order ID like "ORD-8001".` },
          { status: 404 }
        );
      }
    } else {
      // No orderId specified - pick a random in-transit order with a truck
      const eligibleOrders = await prisma.order.findMany({
        where: {
          status: "IN_TRANSIT",
          truck: { isNot: null },
          riskScore: { lt: 80 },
        },
        include: { truck: true, buyers: true },
        take: 10,
      });
      if (eligibleOrders.length > 0) {
        targetOrder = eligibleOrders[Math.floor(Math.random() * eligibleOrders.length)];
      }
    }

    if (!targetOrder) {
      return NextResponse.json(
        { error: "No eligible orders for incident" },
        { status: 400 }
      );
    }

    // Create the incident with dynamic title and optional custom description
    // discoveryStatus defaults to PENDING - discovery runs when War Room opens
    const incident = await prisma.incident.create({
      data: {
        title: `${targetOrder.itemName} - ${targetOrder.destination} Delivery Crisis`,
        description: description,
        status: "ACTIVE",
        orderId: targetOrder.id,
        // discoveryStatus: "PENDING" is the default
      },
    });

    // Update the target order to AT_RISK status with critical risk score
    await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status: "AT_RISK",
        riskScore: 100,
      },
    });

    // Write initial incident logs (persisted to DB)
    const driverName = targetOrder.truck?.driverName || "Driver";
    const truckId = targetOrder.truck?.id || "Unknown";

    // Use the description from API request (or fallback to default)
    await writeIncidentLog(
      incident.id,
      `CRITICAL: Incident detected on ${truckId}. Report: ${description}`,
      "SYSTEM",
      "ERROR"
    );

    await writeIncidentLog(
      incident.id,
      `Affected shipment: ${targetOrder.itemName} → ${targetOrder.destination}. Estimated impact: $${(targetOrder.sellPrice + targetOrder.costPrice || 0).toLocaleString()}.`,
      "SYSTEM",
      "WARNING"
    );

    await writeIncidentLog(
      incident.id,
      "Autonomous recovery protocols initiated. Spinning up agent swarm...",
      "ORCHESTRATOR",
      "INFO"
    );

    // Create agent run placeholders with dynamic info
    await prisma.agentRun.createMany({
      data: [
        {
          runId: "supplier-agent-" + Date.now(),
          incidentId: incident.id,
          agentRole: "Supplier_Voice",
          agentName: "Supplier Negotiation Agent",
          summary: `Contact suppliers for emergency ${targetOrder.itemName} inventory`,
          status: "IDLE",
          link: "https://example.com/agent/supplier",
        },
        {
          runId: "driver-agent-" + Date.now(),
          incidentId: incident.id,
          agentRole: "Driver_Voice",
          agentName: "Driver Coordination Agent",
          summary: `Reroute ${driverName} (${truckId}) for emergency pickup`,
          status: "IDLE",
          link: "https://example.com/agent/driver",
        },
      ],
    });

    // Trigger Pusher event for real-time dashboard update
    // IMPORTANT: Send the COMPLETE order object so the War Room has all data it needs
    console.log("[Pusher] Triggering demo-started event for order:", targetOrder.id);
    await pusherServer.trigger("sysco-demo", "demo-started", {
      incident,
      affectedOrderId: targetOrder.id,
      // Send the full order with ALL fields needed for FleetMap
      affectedOrder: {
        ...targetOrder,
        // Override status and risk to show as critical
        status: "AT_RISK",
        riskScore: 100,
      },
      message: `CRITICAL ALERT: Shipment ${targetOrder.id} (${targetOrder.itemName}) - Equipment Failure`,
    });

    // NOTE: Smart Recovery discovery is now triggered when the War Room opens
    // See: /api/incidents/[id]/discover

    return NextResponse.json({
      success: true,
      incident,
      affectedOrderId: targetOrder.id,
      message: "Demo crisis initiated",
    });
  } catch (error) {
    console.error("Error triggering demo:", error);
    return NextResponse.json(
      { error: "Failed to trigger demo" },
      { status: 500 }
    );
  }
}
