"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { X, DollarSign, TrendingDown, Users, AlertTriangle } from "lucide-react";
import { usePusher } from "./PusherProvider";
import { useTheme } from "./ThemeProvider";
import { AgentCard } from "./AgentCard";
import { FleetMap, ServiceCenter } from "./FleetMap";
import { EmailToast } from "./EmailToast";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  title: string;
  description?: string | null;
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

interface Buyer {
  id: string;
  name: string;
  segment: string;
  trustScore: number;
  totalSpend: number;
}

interface AffectedOrder {
  id: string;
  itemName: string;
  origin: string;
  destination: string;
  costPrice?: number;
  sellPrice?: number;
  internalBaseCost?: number;
  actualLogisticsCost?: number;
  buyers?: Buyer[];
  truck?: {
    id: string;
    driverName: string;
    vehicleType?: string;
    status?: string;
  } | null;
  // FleetMap required fields
  status?: string;
  carrier?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  riskScore?: number;
  routeGeoJson?: number[][] | null;
  progress?: number;
}

interface WarRoomModalProps {
  incident: Incident;
  affectedOrder?: AffectedOrder | null;
  onClose: () => void;
}

export function WarRoomModal({ incident, affectedOrder, onClose }: WarRoomModalProps) {
  const { pusher } = usePusher();
  const { theme } = useTheme();

  // Calculate financial impact
  const financials = affectedOrder ? {
    costPrice: affectedOrder.costPrice || 0,
    sellPrice: affectedOrder.sellPrice || 0,
    logistics: (affectedOrder.internalBaseCost || 0) + (affectedOrder.actualLogisticsCost || 0),
    grossProfit: (affectedOrder.sellPrice || 0) - (affectedOrder.costPrice || 0),
    netMargin: (affectedOrder.sellPrice || 0) - (affectedOrder.costPrice || 0) -
               (affectedOrder.internalBaseCost || 0) - (affectedOrder.actualLogisticsCost || 0),
    marginPercent: affectedOrder.sellPrice ?
      (((affectedOrder.sellPrice - affectedOrder.costPrice!) / affectedOrder.sellPrice) * 100).toFixed(1) : "0",
  } : null;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [showEmailToast, setShowEmailToast] = useState(false);
  const [foundServiceCenters, setFoundServiceCenters] = useState<ServiceCenter[]>([]);
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

  // Smart Recovery: Trigger discovery when War Room opens
  // This is the correct place to run discovery - NOT on incident creation
  useEffect(() => {
    const initDiscovery = async () => {
      try {
        console.log("[War Room] Initiating discovery for incident:", incident.id);
        const response = await fetch(`/api/incidents/${incident.id}/discover`, {
          method: "POST",
        });
        const data = await response.json();

        console.log("[War Room] Discovery response:", data.status);

        // If discovery already completed, load candidates immediately (no animation)
        if (data.status === "COMPLETED" && data.candidates) {
          console.log("[War Room] Loading cached candidates:", data.candidates.length);
          setFoundServiceCenters(data.candidates);
        }
        // If "STARTED" or "RUNNING", wait for Pusher events (handled below)
      } catch (error) {
        console.error("[War Room] Error initiating discovery:", error);
      }
    };

    initDiscovery();
  }, [incident.id]);

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
    });

    channel.bind("demo-complete", () => {
      setShowEmailToast(true);
      setAgents((prev) =>
        prev.map((agent) => ({ ...agent, status: "FINISHED" }))
      );
    });

    // Listen for service center discovery events (Smart Recovery Workflow)
    // Only handle events for THIS incident (filter by incidentId)
    channel.bind("resource-located", (data: {
      incidentId: string;
      serviceCenter: ServiceCenter;
      rank: number;
      timestamp: string;
    }) => {
      // Only process events for this incident
      if (data.incidentId !== incident.id) {
        console.log("[War Room] Ignoring resource-located for different incident:", data.incidentId);
        return;
      }

      console.log("[War Room] Resource located:", data.serviceCenter.name, "at", data.serviceCenter.distance?.toFixed(1), "mi");

      // Add the service center to state (will appear on map with animation)
      setFoundServiceCenters((prev) => {
        // Avoid duplicates
        if (prev.find(sc => sc.id === data.serviceCenter.id)) return prev;
        return [...prev, data.serviceCenter];
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher, incident.id]);

  const supplierAgent = agents.find((a) => a.agentRole === "Supplier_Voice");
  const driverAgent = agents.find((a) => a.agentRole === "Driver_Voice");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn(
        "rounded-xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col",
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
          <div className="flex-1 p-6 border-r border-[var(--sysco-border)] bg-[var(--sysco-bg)] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                SAMSARA FLEET TRACKING
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE TELEMETRY</span>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-[var(--sysco-surface)]">
              {/* Grid overlay for tech feel */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-10" />
              {/* Check if we have valid route data - use !== undefined to handle 0 coordinates */}
              {affectedOrder &&
               affectedOrder.startLat !== undefined &&
               affectedOrder.startLng !== undefined &&
               affectedOrder.endLat !== undefined &&
               affectedOrder.endLng !== undefined ? (
                <FleetMap
                  orders={[{
                    id: affectedOrder.id,
                    itemName: affectedOrder.itemName,
                    origin: affectedOrder.origin,
                    destination: affectedOrder.destination,
                    status: affectedOrder.status || "AT_RISK",
                    carrier: affectedOrder.carrier || "Sysco Fleet",
                    startLat: affectedOrder.startLat,
                    startLng: affectedOrder.startLng,
                    endLat: affectedOrder.endLat,
                    endLng: affectedOrder.endLng,
                    riskScore: affectedOrder.riskScore || 85,
                    routeGeoJson: affectedOrder.routeGeoJson,
                    progress: affectedOrder.progress ?? 50,
                    truck: affectedOrder.truck ? {
                      id: affectedOrder.truck.id,
                      driverName: affectedOrder.truck.driverName,
                      vehicleType: affectedOrder.truck.vehicleType || "REFRIGERATED",
                      status: affectedOrder.truck.status || "ACTIVE",
                    } : null,
                  }]}
                  incidentStatus="ACTIVE"
                  onIncidentClick={() => {}}
                  viewMode="focused"
                  interactive={true}
                  serviceCenters={foundServiceCenters}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-zinc-900/50">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3 animate-pulse" />
                    <p className="text-zinc-400 font-mono text-sm">
                      {affectedOrder ? "ACQUIRING SATELLITE LOCK..." : "WAITING FOR TELEMETRY..."}
                    </p>
                    {affectedOrder && (
                      <p className="text-zinc-600 text-xs mt-1">
                        {affectedOrder.origin} → {affectedOrder.destination}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Financial Impact, Agents & Logs */}
          <div className="w-[500px] flex flex-col bg-[var(--sysco-surface)]">
            {/* Financial Impact Card */}
            {affectedOrder && financials && (
              <div className="p-4 border-b border-[var(--sysco-border)] bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  FINANCIAL IMPACT AT RISK
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Total Financial Exposure */}
                  <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 uppercase mb-1">
                      <DollarSign className="h-3 w-3" />
                      Total Exposure
                    </div>
                    <div className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                      ${(financials.sellPrice + financials.costPrice).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 space-y-0.5">
                      <div>Revenue: <span className="text-zinc-300">${financials.sellPrice.toLocaleString()}</span></div>
                      <div>Product: <span className="text-zinc-300">${financials.costPrice.toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Client Trust Risk */}
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase mb-1">
                      <Users className="h-3 w-3" />
                      Client Trust at Risk
                    </div>
                    {affectedOrder.buyers && affectedOrder.buyers.length > 0 ? (
                      <>
                        <div className="flex -space-x-2 overflow-hidden py-1">
                          {affectedOrder.buyers.slice(0, 4).map((buyer) => (
                            <div
                              key={buyer.id}
                              className="h-7 w-7 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-semibold text-zinc-600 dark:text-zinc-300"
                              title={buyer.name}
                            >
                              {buyer.name.split(' ')[0][0]}{buyer.name.split(' ').length > 1 ? buyer.name.split(' ')[1][0] : ''}
                            </div>
                          ))}
                          {affectedOrder.buyers.length > 4 && (
                            <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-medium text-zinc-500">
                              +{affectedOrder.buyers.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-red-500 flex items-center gap-1 mt-1">
                          <TrendingDown className="h-3 w-3" />
                          <span>-12 pts if not making delivery on time</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-zinc-400 font-mono">No buyers linked</div>
                    )}
                  </div>
                </div>

                {/* Buyer Details */}
                {affectedOrder.buyers && affectedOrder.buyers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase mb-2">Affected Accounts</div>
                    <div className="space-y-1.5 max-h-[80px] overflow-y-auto">
                      {affectedOrder.buyers.map((buyer) => (
                        <div key={buyer.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{buyer.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {buyer.segment}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className={cn(
                              "text-[10px]",
                              buyer.trustScore >= 95 ? "text-emerald-500" : buyer.trustScore >= 90 ? "text-amber-500" : "text-red-500"
                            )}>
                              Trust: {buyer.trustScore}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Incident Description */}
            {incident.description && (
              <div className="p-4 border-b border-[var(--sysco-border)] bg-red-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 font-mono">Incident Description</div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{incident.description}</p>
                  </div>
                </div>
              </div>
            )}

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
