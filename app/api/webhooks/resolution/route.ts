import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

interface ResolutionPayload {
  incident_id: string;
  outcome?: "SUCCESS" | "FAILED"; // From HappyRobot - defaults to SUCCESS for backward compatibility
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload: ResolutionPayload = await req.json();
    const { incident_id, outcome = "SUCCESS", summary } = payload;

    // Map outcome to incident status
    const incidentStatus = outcome === "SUCCESS" ? "RESOLVED" : "FAILED";
    const agentStatus = outcome === "SUCCESS" ? "FINISHED" : "FAILED";

    // Update incident status based on outcome
    const incident = await prisma.incident.update({
      where: { id: incident_id },
      data: {
        status: incidentStatus,
      },
    });

    // Update all agent runs for this incident based on outcome
    await prisma.agentRun.updateMany({
      where: { incidentId: incident_id },
      data: {
        status: agentStatus,
      },
    });

    // Update order status based on outcome
    if (outcome === "SUCCESS" && incident.orderId) {
      await prisma.order.update({
        where: { id: incident.orderId },
        data: {
          status: "IN_TRANSIT",
          carrier: "Sysco Fleet #882",
        },
      });
    }
    // On FAILED, order remains AT_RISK

    // Trigger Pusher event for demo completion with outcome
    await pusherServer.trigger("sysco-demo", "demo-complete", {
      incident,
      outcome,
      summary:
        summary ||
        (outcome === "SUCCESS"
          ? "Crisis resolved. Delivery rerouted successfully."
          : "Resolution failed. Manual intervention required."),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      incident,
      message: "Demo resolution complete",
    });
  } catch (error) {
    console.error("Error processing resolution:", error);
    return NextResponse.json(
      { error: "Failed to process resolution" },
      { status: 500 }
    );
  }
}
