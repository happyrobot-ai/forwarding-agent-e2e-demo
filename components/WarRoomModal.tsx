"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePusher } from "./PusherProvider";
import { AgentCard } from "./AgentCard";
import { RouteMap } from "./RouteMap";
import { EmailToast } from "./EmailToast";

interface Incident {
  id: string;
  title: string;
  status: string;
}

interface AgentLog {
  timestamp: string;
  stage: string;
  status: string;
  reasoning: string;
}

interface Agent {
  id: number;
  runId: string;
  agentRole: string;
  agentName: string;
  status: string;
  logs: AgentLog[];
}

interface WarRoomModalProps {
  incident: Incident;
  onClose: () => void;
}

export function WarRoomModal({ incident, onClose }: WarRoomModalProps) {
  const { pusher } = usePusher();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [showRouteChange, setShowRouteChange] = useState(false);
  const [showEmailToast, setShowEmailToast] = useState(false);

  // Fetch agents for this incident
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        setAgents(data);

        // Aggregate all logs
        const allLogs: AgentLog[] = [];
        data.forEach((agent: Agent) => {
          if (Array.isArray(agent.logs)) {
            allLogs.push(...agent.logs);
          }
        });
        allLogs.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setLogs(allLogs);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };

    fetchAgents();
  }, []);

  // Listen for Pusher updates
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    channel.bind("agent-update", (data: {
      run_id: string;
      stage: string;
      status: string;
      reasoning?: string;
      ui_action?: string;
      agentRole: string;
      timestamp: string;
    }) => {
      // Update agent status
      setAgents((prev) =>
        prev.map((agent) =>
          agent.runId === data.run_id
            ? {
                ...agent,
                status: data.status === "success" ? "COMPLETED" : data.status === "running" ? "RUNNING" : agent.status,
              }
            : agent
        )
      );

      // Add log entry
      const newLog: AgentLog = {
        timestamp: data.timestamp,
        stage: data.stage,
        status: data.status,
        reasoning: data.reasoning || `Agent ${data.agentRole} - ${data.stage}`,
      };
      setLogs((prev) => [...prev, newLog]);

      // Handle UI actions
      if (data.ui_action === "update_map" || data.stage === "driver_confirmation") {
        setShowRouteChange(true);
      }
    });

    channel.bind("demo-complete", (data: {
      email_content: { to: string; subject: string; body: string };
    }) => {
      setShowEmailToast(true);
      setAgents((prev) =>
        prev.map((agent) => ({ ...agent, status: "FINISHED" }))
      );
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher]);

  const supplierAgent = agents.find((a) => a.agentRole === "Supplier_Voice");
  const driverAgent = agents.find((a) => a.agentRole === "Driver_Voice");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-gray-200 dark:border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Agent War Room
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {incident.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Map */}
          <div className="flex-1 p-6 border-r border-gray-200 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
              Samsara Fleet Tracking
            </h3>
            <RouteMap showReroute={showRouteChange} />
          </div>

          {/* Right Side - Agents & Logs */}
          <div className="w-[500px] flex flex-col">
            {/* Agent Cards */}
            <div className="p-6 space-y-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Active Agents
              </h3>
              <div className="space-y-3">
                {supplierAgent && <AgentCard agent={supplierAgent} />}
                {driverAgent && <AgentCard agent={driverAgent} />}
              </div>
            </div>

            {/* Live Reasoning Log */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                Live Reasoning Log
              </h3>
              <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-500">
                    Waiting for agent activity...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, idx) => (
                      <div key={idx} className="text-green-400">
                        <span className="text-gray-500">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>{" "}
                        <span
                          className={
                            log.status === "success"
                              ? "text-green-400"
                              : log.status === "failed"
                              ? "text-red-400"
                              : "text-yellow-400"
                          }
                        >
                          [{log.stage.toUpperCase()}]
                        </span>{" "}
                        {log.reasoning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Toast */}
        {showEmailToast && (
          <EmailToast onClose={() => setShowEmailToast(false)} />
        )}
      </div>
    </div>
  );
}
