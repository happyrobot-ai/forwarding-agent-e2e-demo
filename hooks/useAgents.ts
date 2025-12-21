import useSWR, { mutate } from "swr";
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
}

interface UseAgentsOptions {
  incidentId?: string;
}

interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Agent[] | undefined>;
  updateAgentStatus: (agentRole: string, status: string) => void;
}

/**
 * SWR hook for fetching agents.
 * Optionally filters by incidentId.
 */
export function useAgents(options: UseAgentsOptions = {}): UseAgentsReturn {
  const { incidentId } = options;

  const { data, error, isLoading, mutate: boundMutate } = useSWR<Agent[]>(
    SWR_KEYS.AGENTS,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    }
  );

  // Filter by incidentId if provided
  const agents = incidentId
    ? (data ?? []).filter((a) => a.incidentId === incidentId)
    : (data ?? []);

  /**
   * Optimistically update agent status.
   * Useful for Pusher "agent-update" events.
   */
  const updateAgentStatus = (agentRole: string, status: string) => {
    boundMutate(
      (currentAgents) => {
        if (!currentAgents) return currentAgents;
        return currentAgents.map((agent) =>
          agent.agentRole === agentRole ? { ...agent, status } : agent
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
    mutate: boundMutate,
    updateAgentStatus,
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
  return mutate<Agent[]>(
    SWR_KEYS.AGENTS,
    (currentAgents) => {
      if (!currentAgents) return currentAgents;
      return currentAgents.map((agent) =>
        agent.agentRole === agentRole ? { ...agent, status } : agent
      );
    },
    { revalidate: false }
  );
}
