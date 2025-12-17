import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

interface ResolutionPayload {
  incident_id: string;
  email_content?: {
    to: string;
    subject: string;
    body: string;
  };
  cost_savings?: {
    avoided_loss: number;
    additional_cost: number;
    net_savings: number;
  };
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload: ResolutionPayload = await req.json();
    const { incident_id, email_content, cost_savings, summary } = payload;

    // Update incident to RESOLVED
    const incident = await prisma.incident.update({
      where: { id: incident_id },
      data: {
        status: "RESOLVED",
      },
    });

    // Update all agent runs for this incident to COMPLETED
    await prisma.agentRun.updateMany({
      where: { incidentId: incident_id },
      data: {
        status: "FINISHED",
      },
    });

    // Ensure order is marked as IN_TRANSIT
    await prisma.order.update({
      where: { id: "8821" },
      data: {
        status: "IN_TRANSIT",
        carrier: "Sysco Fleet #882",
      },
    });

    // Trigger Pusher event for demo completion
    await pusherServer.trigger("sysco-demo", "demo-complete", {
      incident,
      email_content: email_content || {
        to: "texas.quality.meats@example.com",
        subject: "Pickup Confirmation - Load #9901",
        body: "Driver Marcus (Fleet #882) is en route to your facility for pickup of 5 pallets Prime Rib. ETA: 15 minutes. Please have loading dock ready. Contact: dispatch@sysco.com",
      },
      cost_savings: cost_savings || {
        avoided_loss: 45000,
        additional_cost: 250,
        net_savings: 44750,
      },
      summary:
        summary ||
        "Crisis resolved. Prime Rib secured from Texas Quality Meats. Driver Marcus rerouted for pickup. Expected delivery to DFW by 6:00 PM.",
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
