import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

export async function POST() {
  try {
    // Clear incident-related data
    await prisma.agentRun.deleteMany();
    await prisma.incident.deleteMany();

    // Remove any incident-specific orders (those starting with INCIDENT-)
    await prisma.order.deleteMany({
      where: { id: { startsWith: "INCIDENT" } },
    });

    // Reset CANCELLED orders (the affected order during incident) back to normal
    await prisma.order.updateMany({
      where: {
        status: "CANCELLED",
      },
      data: {
        status: "IN_TRANSIT",
        riskScore: 15, // Reset to low risk
      },
    });

    // Reset any DELAYED (cascading risk) orders back to normal
    await prisma.order.updateMany({
      where: {
        status: "DELAYED",
      },
      data: {
        status: "IN_TRANSIT",
        riskScore: 10, // Reset to low risk
      },
    });

    // Reset any AT_RISK orders back to IN_TRANSIT
    await prisma.order.updateMany({
      where: {
        status: "AT_RISK",
      },
      data: {
        status: "IN_TRANSIT",
        riskScore: 15, // Reset to low risk (green)
      },
    });

    // Also reset any orders with high risk scores back to normal
    await prisma.order.updateMany({
      where: {
        riskScore: { gte: 40 },
      },
      data: {
        status: "IN_TRANSIT",
        riskScore: 15, // Reset to low risk (green)
      },
    });

    // Trigger Pusher event for real-time dashboard update
    await pusherServer.trigger("sysco-demo", "demo-complete", {
      message: "Demo reset - System restored to nominal",
    });

    return NextResponse.json({
      success: true,
      message: "Demo reset complete",
    });
  } catch (error) {
    console.error("Error resetting demo:", error);
    return NextResponse.json(
      { error: "Failed to reset demo" },
      { status: 500 }
    );
  }
}
