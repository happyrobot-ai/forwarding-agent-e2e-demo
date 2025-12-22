import useSWR, { mutate } from "swr";
import { useEffect, useRef, useCallback } from "react";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface Agent {
  id: number;
  runId: string;
  incidentId: string;
  agentRole: string;
  agentName: string;
  summary: string;
  status: string;
  link: string;
  logs?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

// API response format (snake_case)
interface AgentApiResponse {
  id: number;
  run_id: string;
  agent_id: string;
  agent_name: string;
  agent_role?: string;
  summary: string;
  status: string;
  link: string;
  incident_id?: string;
  incident?: {
    id: string;
    title: string;
    status: string;
    order_id?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

interface UseAgentsOptions {
  incidentId?: string;
  /** Enable polling for RUNNING agents (polls HappyRobot API) */
  pollRunning?: boolean;
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => Promise<AgentApiResponse[] | undefined>;
  updateAgentStatus: (agentRole: string, status: string) => void;
  /** Stats for quick access */
  stats: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}

/**
 * Transform API response to internal format
 */
function transformAgent(apiAgent: AgentApiResponse): Agent {
  return {
    id: apiAgent.id,
    runId: apiAgent.run_id || apiAgent.agent_id,
    incidentId: apiAgent.incident_id || "",
    agentRole: apiAgent.agent_role || "",
    agentName: apiAgent.agent_name,
    summary: apiAgent.summary,
    status: apiAgent.status,
    link: apiAgent.link,
    createdAt: apiAgent.created_at,
    updatedAt: apiAgent.updated_at,
  };
}

/**
 * SWR hook for fetching agents with optional HappyRobot status polling.
 *
 * When pollRunning=true, automatically polls /api/agents/status for RUNNING agents
 * to get real-time status from HappyRobot Platform API.
 */
export function useAgents(options: UseAgentsOptions = {}): UseAgentsReturn {
  const {
    incidentId,
    pollRunning = false,
    pollInterval = 5000,
    debug = false
  } = options;

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log("[useAgents]", ...args);
  }, [debug]);

  const { data, error, isLoading, mutate: boundMutate } = useSWR<AgentApiResponse[]>(
    SWR_KEYS.AGENTS,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    }
  );

  // Transform and filter agents
  const agents = (data ?? [])
    .map(transformAgent)
    .filter((a) => !incidentId || a.incidentId === incidentId);

  // Calculate stats
  const stats = {
    total: agents.length,
    running: agents.filter((a) => a.status === "RUNNING" || a.status === "ACTIVE").length,
    completed: agents.filter((a) => a.status === "COMPLETED" || a.status === "FINISHED").length,
    failed: agents.filter((a) => a.status === "FAILED").length,
  };

  /**
   * Poll HappyRobot API for a single agent's status
   */
  const checkAgentStatus = useCallback(async (agent: Agent) => {
    if (!agent.runId || (agent.status !== "RUNNING" && agent.status !== "ACTIVE")) {
      return;
    }

    try {
      log(`Checking status for run_id: ${agent.runId}`);
      const response = await fetch(`/api/agents/status?run_id=${agent.runId}`);

      if (!response.ok) {
        log(`API returned ${response.status}`);
        return;
      }

      const data = await response.json();
      const runStatus = data.status?.toLowerCase();
      log(`Run status for ${agent.runId}: ${runStatus}`);

      // Terminal statuses that should update the agent
      const terminalStatuses = ["completed", "canceled", "failed"];

      if (terminalStatuses.includes(runStatus)) {
        log(`Agent ${agent.runId} finished with status: ${runStatus}`);
        // The API already updates the DB, just revalidate our cache
        await boundMutate();
      }
    } catch (error) {
      console.error("[useAgents] Error checking run status:", error);
    }
  }, [boundMutate, log]);

  /**
   * Poll all running agents
   */
  const pollRunningAgents = useCallback(() => {
    const runningAgents = agents.filter(
      (a) => (a.status === "RUNNING" || a.status === "ACTIVE") && a.runId
    );

    if (runningAgents.length > 0) {
      log(`Polling ${runningAgents.length} running agent(s)...`);
      runningAgents.forEach((agent) => checkAgentStatus(agent));
    }
  }, [agents, checkAgentStatus, log]);

  // Set up polling for running agents
  useEffect(() => {
    if (!pollRunning) return;

    const runningAgents = agents.filter(
      (a) => (a.status === "RUNNING" || a.status === "ACTIVE") && a.runId
    );

    if (runningAgents.length > 0) {
      log(`Starting polling for ${runningAgents.length} running agent(s)...`);

      // Check immediately
      pollRunningAgents();

      // Then poll on interval
      pollingRef.current = setInterval(pollRunningAgents, pollInterval);
    } else {
      log("No running agents to poll");
    }

    return () => {
      if (pollingRef.current) {
        log("Stopping polling");
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollRunning, pollInterval, agents.length, stats.running, pollRunningAgents, log]);

  /**
   * Optimistically update agent status.
   * Useful for Pusher "agent-update" events.
   */
  const updateAgentStatus = (agentRole: string, status: string) => {
    boundMutate(
      (currentAgents) => {
        if (!currentAgents) return currentAgents;
        return currentAgents.map((agent) =>
          agent.agent_role === agentRole ? { ...agent, status } : agent
        );
      },
      { revalidate: false }
    );
  };

  return {
    agents,
    isLoading,
    isError: !!error,
    error,
    refetch: boundMutate,
    updateAgentStatus,
    stats,
  };
}

/**
 * Utility to revalidate agents from anywhere.
 */
export function revalidateAgents() {
  return mutate(SWR_KEYS.AGENTS);
}

/**
 * Utility to update agent status from anywhere.
 */
export function mutateAgentStatus(agentRole: string, status: string) {
  return mutate<AgentApiResponse[]>(
    SWR_KEYS.AGENTS,
    (currentAgents) => {
      if (!currentAgents) return currentAgents;
      return currentAgents.map((agent) =>
        agent.agent_role === agentRole ? { ...agent, status } : agent
      );
    },
    { revalidate: false }
  );
}
