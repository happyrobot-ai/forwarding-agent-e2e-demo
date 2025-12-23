import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { writeIncidentLog, LogStatus } from "@/lib/incident-logger";

interface AgentUpdatePayload {
  run_id: string;
  stage: string;
  status: "success" | "failed" | "running";
  reasoning?: string;
  ui_action?: string;
  data?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const payload: AgentUpdatePayload = await req.json();
    const { run_id, stage, status, reasoning, ui_action, data } = payload;

    // Find the agent run
    const agentRun = await prisma.agentRun.findUnique({
      where: { runId: run_id },
    });

    if (!agentRun) {
      return NextResponse.json(
        { error: "Agent run not found" },
        { status: 404 }
      );
    }

    // Update agent run with new log entry
    const logs = Array.isArray(agentRun.logs) ? agentRun.logs : [];
    const newLog = {
      timestamp: new Date().toISOString(),
      stage,
      status,
      reasoning: reasoning || `Stage: ${stage}`,
    };

    // Determine agent status based on stage and status
    let agentStatus = agentRun.status;
    if (status === "running") {
      agentStatus = "RUNNING";
    } else if (status === "success") {
      agentStatus = "COMPLETED";
    } else if (status === "failed") {
      agentStatus = "FAILED";
    }

    await prisma.agentRun.update({
      where: { runId: run_id },
      data: {
        status: agentStatus,
        logs: [...logs, newLog],
      },
    });

    // Write to unified incident_logs table for War Room visibility
    // Map agent status to log status
    const logStatus: LogStatus = status === "success" ? "SUCCESS"
      : status === "failed" ? "ERROR"
      : "INFO";

    // Determine source based on agent role
    const logSource = agentRun.agentRole === "Driver_Voice"
      ? "AGENT:DRIVER"
      : "AGENT:FACILITY";  // Facility_Voice and other agents contact facilities

    await writeIncidentLog(
      agentRun.incidentId,
      reasoning || `[${stage}] ${agentRun.agentName} - ${status}`,
      logSource,
      logStatus
    );

    // Handle specific stages
    if (stage === "supplier_negotiation" && status === "success") {
      // Update order to RECOVERING
      await prisma.order.update({
        where: { id: "8821" },
        data: {
          status: "RECOVERING",
          carrier: "Searching Fleet...",
        },
      });
    }

    if (stage === "driver_confirmation" && status === "success") {
      // Update order to IN_TRANSIT
      await prisma.order.update({
        where: { id: "8821" },
        data: {
          status: "IN_TRANSIT",
          carrier: "Sysco Fleet #882",
        },
      });
    }

    // Trigger Pusher event for real-time UI update
    // Send uppercase status to match UI expectations
    await pusherServer.trigger("sysco-demo", "agent-update", {
      run_id,
      stage,
      status: agentStatus, // Use the normalized uppercase status (RUNNING/COMPLETED/FAILED)
      reasoning,
      ui_action,
      data,
      agentRole: agentRun.agentRole,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Agent update processed",
    });
  } catch (error) {
    console.error("Error processing agent update:", error);
    return NextResponse.json(
      { error: "Failed to process agent update" },
      { status: 500 }
    );
  }
}
