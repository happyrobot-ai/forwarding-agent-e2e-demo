import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(request: NextRequest) {
  try {
    // Get the orderId from request body
    const body = await request.json().catch(() => ({}));
    const { orderId } = body as { orderId?: string };

    // Clear only incident-related data (preserve background orders)
    await prisma.agentRun.deleteMany();
    await prisma.incident.deleteMany();

    // Get the selected order (or use a random one if not specified)
    let targetOrder;
    if (orderId) {
      targetOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { truck: true, buyers: true },
      });
    }

    if (!targetOrder) {
      // Fallback: pick a random in-transit order with a truck
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

    // Create the incident with dynamic title
    const incident = await prisma.incident.create({
      data: {
        title: `${targetOrder.itemName} - ${targetOrder.destination} Delivery Crisis`,
        status: "ACTIVE",
      },
    });

    // Update the target order to critical status
    await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status: "CANCELLED",
        riskScore: 100,
      },
    });

    // Create agent run placeholders with dynamic info
    const driverName = targetOrder.truck?.driverName || "Driver";
    const truckId = targetOrder.truck?.id || "Unknown";

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
    await pusherServer.trigger("sysco-demo", "demo-started", {
      incident,
      affectedOrderId: targetOrder.id,
      affectedOrder: {
        id: targetOrder.id,
        itemName: targetOrder.itemName,
        origin: targetOrder.origin,
        destination: targetOrder.destination,
        orderValue: targetOrder.orderValue,
        truck: targetOrder.truck,
        endLat: targetOrder.endLat,
        endLng: targetOrder.endLng,
        // Financial data
        costPrice: targetOrder.costPrice,
        sellPrice: targetOrder.sellPrice,
        internalBaseCost: targetOrder.internalBaseCost,
        actualLogisticsCost: targetOrder.actualLogisticsCost,
        // Buyer relationships
        buyers: targetOrder.buyers,
      },
      message: `CRITICAL ALERT: Shipment ${targetOrder.id} (${targetOrder.itemName}) - Equipment Failure`,
    });

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
