"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { usePusher } from "./PusherProvider";
import { useTheme } from "./ThemeProvider";
import { AgentCard } from "./AgentCard";
import { RouteMap } from "./RouteMap";
import { EmailToast } from "./EmailToast";
import { cn } from "@/lib/utils";

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
  const { theme } = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [showRouteChange, setShowRouteChange] = useState(false);
  const [showEmailToast, setShowEmailToast] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const getHappyRobotLogo = () => {
    return theme === "dark"
      ? "/happyrobot/Footer-logo-white.png"
      : "/happyrobot/Footer-logo-black.png";
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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

    channel.bind("demo-complete", () => {
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn(
        "rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col",
        "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between",
          "bg-[var(--status-error-bg)] border-[var(--status-error-border)]"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src={getHappyRobotLogo()}
                  alt="HappyRobot"
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <h2 className="text-lg font-semibold text-[var(--status-error-text)]">
                  HappyRobot War Room
                </h2>
              </div>
              <p className="text-xs text-[var(--status-error-text)] opacity-80 font-mono mt-0.5">
                INCIDENT: {incident.id.slice(0, 8).toUpperCase()} • {incident.title.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors border border-[var(--status-error-border)]"
          >
            <X className="h-5 w-5 text-[var(--status-error-text)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Map */}
          <div className="flex-1 p-6 border-r border-[var(--sysco-border)] bg-[var(--sysco-bg)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                SAMSARA FLEET TRACKING
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE TELEMETRY</span>
              </div>
            </div>
            <div className="relative h-full rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-[var(--sysco-surface)]">
              {/* Grid overlay for tech feel */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
              <RouteMap showReroute={showRouteChange} />
            </div>
          </div>

          {/* Right Side - Agents & Logs */}
          <div className="w-[500px] flex flex-col bg-[var(--sysco-surface)]">
            {/* Agent Cards */}
            <div className="p-6 space-y-4 border-b border-[var(--sysco-border)]">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                ACTIVE AGENTS
              </h3>
              <div className="space-y-3">
                {supplierAgent && <AgentCard agent={supplierAgent} />}
                {driverAgent && <AgentCard agent={driverAgent} />}
                {!supplierAgent && !driverAgent && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-600 font-mono">
                    Initializing agents...
                  </div>
                )}
              </div>
            </div>

            {/* Live Reasoning Log - Terminal Style */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--sysco-border)] bg-zinc-100 dark:bg-zinc-900 px-4 py-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  SYSTEM_LOGS // AGENT_ORCHESTRATOR
                </span>
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
              </div>
              <div className="flex-1 bg-white dark:bg-black p-4 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-zinc-500 dark:text-zinc-600">
                    <span className="text-zinc-400 dark:text-zinc-700">[{new Date().toLocaleTimeString()}]</span>{" "}
                    <span className="text-zinc-400 dark:text-zinc-500">{">"}</span> Waiting for agent activity...
                    <span className="animate-pulse text-emerald-500 ml-1">_</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2 leading-relaxed">
                        <span className="text-zinc-400 dark:text-zinc-600 shrink-0">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-600 shrink-0">{">"}</span>
                        <span
                          className={cn(
                            "shrink-0",
                            log.status === "success"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : log.status === "failed"
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          [{log.stage.toUpperCase()}]
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {log.reasoning}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                    {/* Blinking cursor */}
                    <div className="flex gap-2">
                      <span className="text-zinc-400 dark:text-zinc-600 shrink-0">
                        [{new Date().toLocaleTimeString()}]
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-600 shrink-0">{">"}</span>
                      <span className="animate-pulse text-emerald-500">_</span>
                    </div>
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
