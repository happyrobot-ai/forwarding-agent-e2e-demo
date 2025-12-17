import { useState, useEffect, useCallback, useRef } from "react";

export interface Agent {
  id: number;
  agent_id: string;
  agent_name: string;
  summary: string;
  status: string;
  link: string;
  run_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseAgentPollingOptions {
  pollInterval?: number;
  onlyActive?: boolean;
  debug?: boolean;
}

export function useAgentPolling(options: UseAgentPollingOptions = {}) {
  const { pollInterval = 5000, onlyActive = false, debug = true } = options;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log("[Agent Polling]", ...args);
  }, [debug]);

  const fetchAgents = useCallback(async () => {
    try {
      const url = onlyActive ? "/api/agents?status=ACTIVE" : "/api/agents";
      log("Fetching agents from", url);

      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        setAgents(data);

        // Set active agent (first one with ACTIVE status)
        const active = data.find((a: Agent) => a.status === "ACTIVE");
        setActiveAgent(active || null);

        if (active) {
          log("Found active agent:", active.agent_id, "run_id:", active.run_id);
        } else {
          log("No active agents found");
        }
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }, [onlyActive, log]);

  const checkRunStatus = useCallback(async (agent: Agent) => {
    if (!agent.run_id || agent.status !== "ACTIVE") return;

    try {
      log("Checking status for run_id:", agent.run_id);
      const response = await fetch(`/api/agents/status?run_id=${agent.run_id}`);

      if (!response.ok) {
        log("API returned", response.status);
        return;
      }

      const data = await response.json();
      const runStatus = data.status?.toLowerCase();
      log("Run status:", runStatus);

      // Terminal statuses: completed, canceled, failed
      // Continue polling for: scheduled, running
      const terminalStatuses = ["completed", "canceled", "failed"];

      if (terminalStatuses.includes(runStatus)) {
        log(`Agent finished with status: ${runStatus}. Updating to FINISHED...`);

        await fetch("/api/agents", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: agent.id,
            agent_id: agent.agent_id,
            agent_name: agent.agent_name,
            summary: agent.summary,
            status: "FINISHED",
            link: agent.link,
            run_id: agent.run_id,
          }),
        });

        // Refresh agents list (this will stop polling since agent is no longer ACTIVE)
        fetchAgents();
      } else if (runStatus === "running" || runStatus === "scheduled") {
        log(`Run still ${runStatus}, continuing to poll...`);
      } else {
        log(`Unknown run status: ${runStatus}`);
      }
    } catch (error) {
      console.error("Error checking run status:", error);
    }
  }, [fetchAgents, log]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAgents();
      setLoading(false);
    };
    init();
  }, [fetchAgents]);

  // Polling for active agents
  useEffect(() => {
    const activeAgents = agents.filter((a) => a.status === "ACTIVE" && a.run_id);

    if (activeAgents.length > 0) {
      log(`Starting polling for ${activeAgents.length} active agent(s)...`);

      // Check status immediately
      activeAgents.forEach((agent) => checkRunStatus(agent));

      // Start polling
      pollingRef.current = setInterval(() => {
        log("Polling tick...");
        activeAgents.forEach((agent) => checkRunStatus(agent));
      }, pollInterval);
    } else {
      log("No active agents to poll");
    }

    return () => {
      if (pollingRef.current) {
        log("Cleaning up polling");
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [agents, checkRunStatus, pollInterval, log]);

  return {
    agents,
    activeAgent,
    loading,
    refetch: fetchAgents,
  };
}
