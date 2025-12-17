import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agents/status?run_id=xxx
// This endpoint simulates checking an external agent platform's status
// In a real implementation, this would make a request to your agent platform API
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const run_id = searchParams.get("run_id");

    if (!run_id) {
      return NextResponse.json(
        { error: "run_id parameter required" },
        { status: 400 }
      );
    }

    // Find the agent run in our database
    const agentRun = await prisma.agentRun.findUnique({
      where: { runId: run_id },
    });

    if (!agentRun) {
      return NextResponse.json(
        { error: "Agent run not found" },
        { status: 404 }
      );
    }

    // Map our internal status to agent platform status format
    const statusMap: Record<string, string> = {
      IDLE: "scheduled",
      RUNNING: "running",
      ACTIVE: "running",
      COMPLETED: "completed",
      FINISHED: "completed",
      FAILED: "failed",
    };

    const externalStatus = statusMap[agentRun.status] || "scheduled";

    return NextResponse.json({
      run_id: agentRun.runId,
      status: externalStatus,
      agent_name: agentRun.agentName,
      agent_role: agentRun.agentRole,
      summary: agentRun.summary,
      logs: agentRun.logs,
      updated_at: agentRun.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error checking agent status:", error);
    return NextResponse.json(
      { error: "Failed to check agent status" },
      { status: 500 }
    );
  }
}
