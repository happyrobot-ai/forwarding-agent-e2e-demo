import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

export async function POST() {
  try {
    // Clear existing demo data
    await prisma.agentRun.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.order.deleteMany();

    // Create the "Prime Rib Crisis" incident
    const incident = await prisma.incident.create({
      data: {
        title: "Prime Rib Shortage - DFW Distribution Center",
        status: "ACTIVE",
      },
    });

    // Create the cancelled order
    await prisma.order.create({
      data: {
        id: "8821",
        itemName: "Prime Rib (5 Pallets)",
        status: "CANCELLED",
        carrier: "External Supplier - Equipment Failure",
      },
    });

    // Create sample "normal" orders
    await prisma.order.createMany({
      data: [
        {
          id: "8820",
          itemName: "Fresh Vegetables",
          status: "CONFIRMED",
          carrier: "Sysco Fleet #881",
        },
        {
          id: "8822",
          itemName: "Frozen Seafood",
          status: "IN_TRANSIT",
          carrier: "Sysco Fleet #883",
        },
        {
          id: "8823",
          itemName: "Dairy Products",
          status: "CONFIRMED",
          carrier: "External - Prime Logistics",
        },
      ],
    });

    // Create agent run placeholders
    await prisma.agentRun.createMany({
      data: [
        {
          runId: "supplier-agent-" + Date.now(),
          incidentId: incident.id,
          agentRole: "Supplier_Voice",
          agentName: "Supplier Negotiation Agent",
          summary: "Contact Texas Quality Meats for emergency inventory",
          status: "IDLE",
          link: "https://example.com/agent/supplier",
        },
        {
          runId: "driver-agent-" + Date.now(),
          incidentId: incident.id,
          agentRole: "Driver_Voice",
          agentName: "Driver Coordination Agent",
          summary: "Reroute Marcus (Driver #882) for pickup",
          status: "IDLE",
          link: "https://example.com/agent/driver",
        },
      ],
    });

    // Trigger Pusher event for real-time dashboard update
    await pusherServer.trigger("sysco-demo", "demo-started", {
      incident,
      message: "CRITICAL ALERT: Inbound Shipment #8821 (Prime Rib) Cancelled",
    });

    return NextResponse.json({
      success: true,
      incident,
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
