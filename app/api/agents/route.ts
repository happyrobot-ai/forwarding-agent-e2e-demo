import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agents - List all agents or filter by status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status ? { status: status as any } : {};

    const agents = await prisma.agentRun.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to match the expected Agent interface
    const formattedAgents = agents.map((agent) => ({
      id: agent.id,
      agent_id: agent.runId,
      agent_name: agent.agentName,
      summary: agent.summary,
      status: agent.status,
      link: agent.link,
      run_id: agent.runId,
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedAgents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// PUT /api/agents - Update an agent
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, agent_id, agent_name, summary, status, link, run_id } = body;

    const agent = await prisma.agentRun.update({
      where: { id: parseInt(id.toString()) },
      data: {
        runId: run_id || agent_id,
        agentName: agent_name,
        summary,
        status,
        link,
      },
    });

    const formattedAgent = {
      id: agent.id,
      agent_id: agent.runId,
      agent_name: agent.agentName,
      summary: agent.summary,
      status: agent.status,
      link: agent.link,
      run_id: agent.runId,
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedAgent);
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent run
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      run_id,
      incident_id,
      agent_role,
      agent_name,
      summary,
      status = "IDLE",
      link = "",
    } = body;

    const agent = await prisma.agentRun.create({
      data: {
        runId: run_id,
        incidentId: incident_id,
        agentRole: agent_role,
        agentName: agent_name,
        summary,
        status,
        link,
      },
    });

    const formattedAgent = {
      id: agent.id,
      agent_id: agent.runId,
      agent_name: agent.agentName,
      summary: agent.summary,
      status: agent.status,
      link: agent.link,
      run_id: agent.runId,
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedAgent);
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
