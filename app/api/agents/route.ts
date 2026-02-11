import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AgentStatusType = "IDLE" | "RUNNING" | "ACTIVE" | "COMPLETED" | "FINISHED" | "FAILED";

// HappyRobot Platform API v1 configuration
const HAPPYROBOT_API_URL = "https://platform.happyrobot.ai/api/v1";
const HAPPYROBOT_API_TOKEN = process.env.HAPPYROBOT_API_TOKEN || "";
const HAPPYROBOT_USE_CASE_ID = process.env.HAPPYROBOT_USE_CASE_ID || "";
const HAPPYROBOT_ORG_ID = process.env.HAPPYROBOT_ORG_ID || "";

// Mock completed runs for demo display
// These appear below any real running workflows
// ETA requests use Michelin/William, others have made-up customer/contact data
const MOCK_COMPLETED_RUNS = [
  {
    id: "mock-001",
    summary: "Booking request - Shipment LAX to JFK",
    customer: "Target",
    contact: "Jennifer Adams",
    created_at: "2026-02-11T10:30:00.000Z",
    completed_at: "2026-02-11T10:32:15.000Z",
  },
  {
    id: "mock-002", 
    summary: "ETA request - Booking CEVA-24680",
    customer: "Michelin",
    contact: "William",
    created_at: "2026-02-11T09:45:00.000Z",
    completed_at: "2026-02-11T09:47:30.000Z",
  },
  {
    id: "mock-003",
    summary: "Booking request - Automotive parts Miami to Detroit",
    customer: "General Motors",
    contact: "Robert Chen",
    created_at: "2026-02-11T09:15:00.000Z",
    completed_at: "2026-02-11T09:18:45.000Z",
  },
  {
    id: "mock-004",
    summary: "ETA request - Booking CEVA-13579 (In Transit - I-10 Corridor, Louisiana)",
    customer: "Michelin",
    contact: "William",
    created_at: "2026-02-11T08:30:00.000Z",
    completed_at: "2026-02-11T08:32:00.000Z",
  },
  {
    id: "mock-005",
    summary: "Booking request - Electronics shipment SFO to ORD",
    customer: "Best Buy",
    contact: "Amanda Torres",
    created_at: "2026-02-10T16:20:00.000Z",
    completed_at: "2026-02-10T16:24:30.000Z",
  },
  {
    id: "mock-006",
    summary: "Urgent booking - Pharmaceutical delivery",
    customer: "Pfizer",
    contact: "Dr. Sarah Mitchell",
    created_at: "2026-02-10T14:45:00.000Z",
    completed_at: "2026-02-10T14:48:15.000Z",
  },
  {
    id: "mock-007",
    summary: "Booking request - Industrial equipment Houston to Phoenix",
    customer: "Caterpillar",
    contact: "Marcus Johnson",
    created_at: "2026-02-10T11:30:00.000Z",
    completed_at: "2026-02-10T11:35:00.000Z",
  },
  {
    id: "mock-008",
    summary: "ETA request - Booking CEVA-98765",
    customer: "Michelin",
    contact: "William",
    created_at: "2026-02-10T10:00:00.000Z",
    completed_at: "2026-02-10T10:02:30.000Z",
  },
  {
    id: "mock-009",
    summary: "Booking request - Retail goods Atlanta to Dallas",
    customer: "Home Depot",
    contact: "Patricia Williams",
    created_at: "2026-02-09T15:30:00.000Z",
    completed_at: "2026-02-09T15:34:00.000Z",
  },
  {
    id: "mock-010",
    summary: "Modification - Update delivery address CEVA-54321",
    customer: "Amazon",
    contact: "Kevin Park",
    created_at: "2026-02-09T13:15:00.000Z",
    completed_at: "2026-02-09T13:17:30.000Z",
  },
];

// Map HappyRobot status to internal status
function mapHappyRobotStatus(status: string): AgentStatusType {
  const statusMap: Record<string, AgentStatusType> = {
    pending: "IDLE",
    scheduled: "IDLE",
    running: "RUNNING",
    in_progress: "RUNNING",
    completed: "COMPLETED",
    finished: "COMPLETED",
    success: "COMPLETED",
    failed: "FAILED",
    error: "FAILED",
    canceled: "FAILED",
    cancelled: "FAILED",
  };
  return statusMap[status?.toLowerCase()] || "IDLE";
}

// HappyRobot API v1 run response interface (list endpoint)
interface HappyRobotRunV1 {
  id: string;
  status: string;
  org_id: string;
  timestamp: string;
  use_case_id: string;
  version_id: string;
  annotation: string | null;
  completed_at: string | null;
  data: Record<string, unknown>;
}

// HappyRobot API v1 detailed run response interface
interface HappyRobotRunDetailV1 {
  id: string;
  status: string;
  org_id: string;
  timestamp: string;
  use_case_id: string;
  version_id: string;
  annotation: string | null;
  completed_at: string | null;
  events?: Array<{
    type: string;
    output?: {
      subject?: string;
      message?: string;
      channel?: string;
    };
  }>;
}

// Extracted info from email content
interface ExtractedRunInfo {
  summary: string;
  customer: string;
  contact: string;
}

// Cache for extracted run info - persists across requests
const runInfoCache = new Map<string, ExtractedRunInfo>();

// Extract summary, customer, and contact from run details based on email content
// Uses cache to persist info - once extracted, it won't revert to defaults
function extractRunInfo(runId: string, detail: HappyRobotRunDetailV1 | null): ExtractedRunInfo {
  // Check cache first - if we already have meaningful info, use it
  const cachedInfo = runInfoCache.get(runId);
  if (cachedInfo && cachedInfo.summary !== "Processing...") {
    return cachedInfo;
  }

  // Default info
  const defaultInfo: ExtractedRunInfo = {
    summary: "Processing...",
    customer: "Unknown",
    contact: "Unknown",
  };

  if (!detail?.events?.length) {
    return cachedInfo || defaultInfo;
  }

  // Find the first action event with email output
  const actionEvent = detail.events.find(
    (e) => e.type === "action" && e.output?.message
  );

  if (!actionEvent?.output) {
    const fallbackSummary = detail.events[0]?.output?.subject || "Agent run";
    const fallbackInfo: ExtractedRunInfo = { 
      summary: fallbackSummary, 
      customer: "Unknown", 
      contact: "Unknown" 
    };
    runInfoCache.set(runId, fallbackInfo);
    return fallbackInfo;
  }

  const { subject, message } = actionEvent.output;
  const msgLower = message?.toLowerCase() || "";
  const subjectLower = subject?.toLowerCase() || "";
  const fullTextLower = `${msgLower} ${subjectLower}`;

  // Check for Ferrari/Enzo first - special case
  if (fullTextLower.includes("ferrari") || fullTextLower.includes("enzo")) {
    const extractedInfo: ExtractedRunInfo = {
      summary: "New booking request tires replacement",
      customer: "Ferrari",
      contact: "Enzo",
    };
    runInfoCache.set(runId, extractedInfo);
    return extractedInfo;
  }

  // Determine intent based on message content
  let extractedSummary: string;
  let customer: string;
  let contact: string;
  
  if (msgLower.includes("eta") || msgLower.includes("status") || msgLower.includes("where is")) {
    extractedSummary = `ETA request - ${subject || "Shipment inquiry"}`;
    customer = "Michelin";
    contact = "William";
  } else if (msgLower.includes("book") || msgLower.includes("ship") || msgLower.includes("quote")) {
    if (subjectLower.includes("urgent") || msgLower.includes("urgent") || msgLower.includes("asap")) {
      extractedSummary = `Urgent booking - ${subject || "New shipment"}`;
    } else {
      extractedSummary = `Booking request - ${subject || "New shipment"}`;
    }
    customer = "Ferrari";
    contact = "Enzo Bianchi";
  } else if (msgLower.includes("cancel")) {
    extractedSummary = `Cancellation - ${subject || "Request"}`;
    customer = "Unknown";
    contact = "Unknown";
  } else if (msgLower.includes("change") || msgLower.includes("modify") || msgLower.includes("update")) {
    extractedSummary = `Modification - ${subject || "Request"}`;
    customer = "Unknown";
    contact = "Unknown";
  } else {
    // Default to subject or generic
    extractedSummary = subject || "Email processing";
    customer = "Unknown";
    contact = "Unknown";
  }

  const extractedInfo: ExtractedRunInfo = { summary: extractedSummary, customer, contact };
  runInfoCache.set(runId, extractedInfo);
  return extractedInfo;
}

// GET /api/agents - Fetch RUNNING runs from HappyRobot API and combine with mock completed runs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Start with mock completed runs
    const mockAgents = MOCK_COMPLETED_RUNS.map((mock, index) => ({
      id: 100 + index, // Start mock IDs at 100 to avoid conflicts
      agent_id: mock.id,
      agent_name: `Agent Run ${mock.id.slice(5)}`,
      agent_role: "AI Agent",
      summary: mock.summary,
      customer: mock.customer,
      contact: mock.contact,
      status: "COMPLETED" as AgentStatusType,
      link: `https://platform.happyrobot.ai/ceva-logistics/workflow/sx7pzejlsqrw/runs`,
      run_id: mock.id,
      incident_id: null,
      incident: null,
      created_at: mock.created_at,
      updated_at: mock.completed_at,
      _happyrobot: {
        original_status: "completed",
        version_id: "mock",
        use_case_id: HAPPYROBOT_USE_CASE_ID,
        org_id: HAPPYROBOT_ORG_ID,
      },
    }));

    // Fetch real running workflows from HappyRobot API
    let realRunningAgents: typeof mockAgents = [];

    if (HAPPYROBOT_API_TOKEN && HAPPYROBOT_USE_CASE_ID && HAPPYROBOT_ORG_ID) {
      try {
        const apiUrl = new URL(`${HAPPYROBOT_API_URL}/runs`);
        apiUrl.searchParams.set("sort", "desc");
        apiUrl.searchParams.set("use_case_id", HAPPYROBOT_USE_CASE_ID);

        console.log(`[Agents API] Fetching runs from HappyRobot v1: ${apiUrl.toString()}`);

        const response = await fetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            "authorization": `Bearer ${HAPPYROBOT_API_TOKEN}`,
            "x-organization-id": HAPPYROBOT_ORG_ID,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (response.ok) {
          const runs: HappyRobotRunV1[] = await response.json();
          
          // Filter to only running/pending runs (not completed/failed)
          const activeRuns = runs.filter(run => 
            run.status === "running" || run.status === "pending" || run.status === "in_progress"
          );
          
          console.log(`[Agents API] Found ${activeRuns.length} active runs out of ${runs.length} total`);

          // Fetch details for active runs to get summaries
          if (activeRuns.length > 0) {
            const detailsPromises = activeRuns.map(async (run) => {
              try {
                const detailResponse = await fetch(`${HAPPYROBOT_API_URL}/runs/${run.id}`, {
                  method: "GET",
                  headers: {
                    "authorization": `Bearer ${HAPPYROBOT_API_TOKEN}`,
                    "x-organization-id": HAPPYROBOT_ORG_ID,
                    "Content-Type": "application/json",
                  },
                  cache: "no-store",
                });
                if (detailResponse.ok) {
                  return await detailResponse.json() as HappyRobotRunDetailV1;
                }
              } catch (e) {
                console.warn(`[Agents API] Failed to fetch details for run ${run.id}:`, e);
              }
              return null;
            });

            const runDetails = await Promise.all(detailsPromises);

            realRunningAgents = activeRuns.map((run, index) => {
              const detail = runDetails[index];
              const runInfo = extractRunInfo(run.id, detail);
              const internalStatus = mapHappyRobotStatus(run.status);

              return {
                id: index + 1,
                agent_id: run.id,
                agent_name: `Agent Run ${run.id.slice(0, 8)}`,
                agent_role: "AI Agent",
                summary: runInfo.summary,
                customer: runInfo.customer,
                contact: runInfo.contact,
                status: internalStatus,
                link: `https://platform.happyrobot.ai/ceva-logistics/workflow/sx7pzejlsqrw/runs?run_id=${run.id}`,
                run_id: run.id,
                incident_id: null,
                incident: null,
                created_at: run.timestamp,
                updated_at: run.completed_at || run.timestamp,
                _happyrobot: {
                  original_status: run.status,
                  version_id: run.version_id,
                  use_case_id: run.use_case_id,
                  org_id: run.org_id,
                },
              };
            });
          }
        } else {
          console.warn(`[Agents API] HappyRobot API returned ${response.status}`);
        }
      } catch (e) {
        console.error("[Agents API] Error fetching from HappyRobot:", e);
        // Continue with just mock data if API fails
      }
    }

    // Combine: real running agents first, then mock completed agents
    const allAgents = [...realRunningAgents, ...mockAgents];

    // Re-index IDs
    const indexedAgents = allAgents.map((agent, index) => ({
      ...agent,
      id: index + 1,
    }));

    // Apply status filter if provided
    const filteredAgents = statusFilter
      ? indexedAgents.filter((agent) => agent.status === statusFilter)
      : indexedAgents;

    console.log(`[Agents API] Returning ${realRunningAgents.length} running + ${mockAgents.length} mock = ${filteredAgents.length} total agents`);

    return NextResponse.json(filteredAgents);
  } catch (error) {
    console.error("[Agents API] Error:", error);
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
