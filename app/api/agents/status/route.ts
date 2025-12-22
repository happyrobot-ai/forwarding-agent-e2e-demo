import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// HappyRobot Platform API configuration
const HAPPYROBOT_API_URL = "https://platform.happyrobot.ai/api/v1";
const HAPPYROBOT_API_KEY = process.env.HAPPYROBOT_API_KEY || "";
const HAPPYROBOT_ORG_ID = process.env.HAPPYROBOT_ORG_ID || "";

interface HappyRobotRunStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  created_at?: string;
  updated_at?: string;
  // Add other fields as needed from HappyRobot API response
}

// GET /api/agents/status?run_id=xxx
// This endpoint polls HappyRobot Platform API for real-time run status
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

    // Find the agent run in our database for metadata
    const agentRun = await prisma.agentRun.findUnique({
      where: { runId: run_id },
    });

    if (!agentRun) {
      return NextResponse.json(
        { error: "Agent run not found" },
        { status: 404 }
      );
    }

    // Call HappyRobot Platform API for real-time status
    let externalStatus = "scheduled";
    let happyRobotData: HappyRobotRunStatus | null = null;

    if (HAPPYROBOT_API_KEY && HAPPYROBOT_ORG_ID) {
      try {
        const response = await fetch(`${HAPPYROBOT_API_URL}/runs/${run_id}`, {
          method: "GET",
          headers: {
            "authorization": `Bearer ${HAPPYROBOT_API_KEY}`,
            "x-organization-id": HAPPYROBOT_ORG_ID,
          },
        });

        if (response.ok) {
          happyRobotData = await response.json() as HappyRobotRunStatus;
          externalStatus = happyRobotData.status || "scheduled";

          // Update our database with the latest status if it changed
          type AgentStatus = "IDLE" | "RUNNING" | "ACTIVE" | "COMPLETED" | "FINISHED" | "FAILED";
          const internalStatusMap: Record<string, AgentStatus> = {
            pending: "IDLE",
            running: "RUNNING",
            completed: "COMPLETED",
            failed: "FAILED",
            canceled: "FAILED",
          };

          const newInternalStatus = internalStatusMap[externalStatus] || agentRun.status as AgentStatus;

          if (newInternalStatus !== agentRun.status) {
            await prisma.agentRun.update({
              where: { runId: run_id },
              data: { status: newInternalStatus },
            });
            console.log(`[HappyRobot] Updated AgentRun ${run_id} status: ${agentRun.status} → ${newInternalStatus}`);
          }
        } else {
          console.warn(`[HappyRobot] Failed to fetch run status: ${response.status}`);
          // Fall back to database status
          const statusMap: Record<string, string> = {
            IDLE: "scheduled",
            RUNNING: "running",
            ACTIVE: "running",
            COMPLETED: "completed",
            FINISHED: "completed",
            FAILED: "failed",
          };
          externalStatus = statusMap[agentRun.status] || "scheduled";
        }
      } catch (apiError) {
        console.error("[HappyRobot] API call failed:", apiError);
        // Fall back to database status
        const statusMap: Record<string, string> = {
          IDLE: "scheduled",
          RUNNING: "running",
          ACTIVE: "running",
          COMPLETED: "completed",
          FINISHED: "completed",
          FAILED: "failed",
        };
        externalStatus = statusMap[agentRun.status] || "scheduled";
      }
    } else {
      // No API credentials - fall back to database status
      console.warn("[HappyRobot] API credentials not configured, using database status");
      const statusMap: Record<string, string> = {
        IDLE: "scheduled",
        RUNNING: "running",
        ACTIVE: "running",
        COMPLETED: "completed",
        FINISHED: "completed",
        FAILED: "failed",
      };
      externalStatus = statusMap[agentRun.status] || "scheduled";
    }

    return NextResponse.json({
      run_id: agentRun.runId,
      status: externalStatus,
      agent_name: agentRun.agentName,
      agent_role: agentRun.agentRole,
      summary: agentRun.summary,
      logs: agentRun.logs,
      updated_at: agentRun.updatedAt.toISOString(),
      // Include HappyRobot data if available
      ...(happyRobotData && { happyrobot_data: happyRobotData }),
    });
  } catch (error) {
    console.error("Error checking agent status:", error);
    return NextResponse.json(
      { error: "Failed to check agent status" },
      { status: 500 }
    );
  }
}
