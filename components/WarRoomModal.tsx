"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { X, AlertTriangle, Terminal } from "lucide-react";
import { usePusher } from "./PusherProvider";
import { useTheme } from "./ThemeProvider";
import { FleetMap, ServiceCenter } from "./FleetMap";
import { AgentCard } from "./AgentCard";
import { EmailToast } from "./EmailToast";
import { cn } from "@/lib/utils";
import { useIncidentLogs, useAgents } from "@/hooks";
import type { IncidentLog } from "@/hooks";
import { AgentCardSkeleton } from "./Skeletons";

// --- TYPES ---
interface Incident {
  id: string;
  title: string;
  description?: string | null;
  status: string;
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

  // SWR hooks for data fetching
  const { logs, isLoading: logsLoading, addLog } = useIncidentLogs(incident.id);
  const { agents, isLoading: agentsLoading, updateAgentStatus } = useAgents({ incidentId: incident.id });

  // Local UI state
  const [showEmailToast, setShowEmailToast] = useState(false);
  const [foundServiceCenters, setFoundServiceCenters] = useState<ServiceCenter[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const discoveryInitiatedRef = useRef(false); // Prevent double-trigger in Strict Mode

  const getHappyRobotLogo = () => {
    return theme === "dark"
      ? "/happyrobot/Footer-logo-white.png"
      : "/happyrobot/Footer-logo-black.png";
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Note: Logs and agents are now fetched via SWR hooks (useIncidentLogs, useAgents)

  // Smart Recovery: Trigger discovery when War Room opens
  useEffect(() => {
    // Prevent double-trigger in React Strict Mode
    if (discoveryInitiatedRef.current) return;
    discoveryInitiatedRef.current = true;

    const initDiscovery = async () => {
      try {
        console.log("[War Room] Initiating discovery for incident:", incident.id);
        const response = await fetch(`/api/incidents/${incident.id}/discover`, {
          method: "POST",
        });
        const data = await response.json();

        console.log("[War Room] Discovery response:", data.status);

        // If discovery already completed, load candidates immediately
        if (data.status === "COMPLETED" && data.candidates) {
          console.log("[War Room] Loading cached candidates:", data.candidates.length);
          setFoundServiceCenters(data.candidates);
        }
        // If "STARTED" or "RUNNING", wait for Pusher events
      } catch (error) {
        console.error("[War Room] Error initiating discovery:", error);
      }
    };

    initDiscovery();
  }, [incident.id]);

  // Subscribe to Pusher for real-time updates
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    // Listen for new incident logs (from writeIncidentLog helper)
    channel.bind("incident-log", (data: { incidentId: string; log: IncidentLog }) => {
      // Only process logs for THIS incident
      if (data.incidentId !== incident.id) return;

      console.log("[War Room] New log received:", data.log.message);
      // Use SWR's addLog for optimistic cache update
      addLog(data.log);
    });

    // Listen for agent status updates
    channel.bind("agent-update", (data: { agentRole: string; status: string }) => {
      // Use SWR's updateAgentStatus for optimistic cache update
      updateAgentStatus(data.agentRole, data.status);
    });

    // Listen for resource discovery (for map markers)
    channel.bind("resource-located", (data: {
      incidentId: string;
      serviceCenter: ServiceCenter;
    }) => {
      if (data.incidentId !== incident.id) return;

      console.log("[War Room] Resource located:", data.serviceCenter.name);
      setFoundServiceCenters((prev) => {
        if (prev.find((sc) => sc.id === data.serviceCenter.id)) return prev;
        return [...prev, data.serviceCenter];
      });
    });

    // Listen for demo completion
    channel.bind("demo-complete", () => {
      setShowEmailToast(true);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher, incident.id]);

  // Get log source color
  const getSourceColor = (source: string) => {
    if (source === "SYSTEM") return "text-zinc-500";
    if (source === "ORCHESTRATOR") return "text-purple-400";
    if (source === "DISCOVERY") return "text-blue-400";
    if (source.startsWith("AGENT:")) return "text-emerald-400";
    return "text-zinc-400";
  };

  // Get log status color
  const getStatusColor = (status: string) => {
    if (status === "SUCCESS") return "text-emerald-300";
    if (status === "WARNING") return "text-amber-300";
    if (status === "ERROR") return "text-red-300";
    return "text-zinc-300";
  };

  // Find specific agents
  const supplierAgent = agents.find((a) => a.agentRole === "Supplier_Voice");
  const driverAgent = agents.find((a) => a.agentRole === "Driver_Voice");

  // Memoize orders array to prevent FleetMap re-renders when service centers are discovered
  // This creates a stable reference that only changes when actual order data changes
  const memoizedOrders = useMemo(() => {
    if (!affectedOrder) return [];
    return [{
      id: affectedOrder.id,
      itemName: affectedOrder.itemName,
      origin: affectedOrder.origin,
      destination: affectedOrder.destination,
      status: affectedOrder.status || "AT_RISK",
      carrier: affectedOrder.carrier || "Sysco Fleet",
      startLat: affectedOrder.startLat!,
      startLng: affectedOrder.startLng!,
      endLat: affectedOrder.endLat!,
      endLng: affectedOrder.endLng!,
      riskScore: affectedOrder.riskScore || 100,
      routeGeoJson: affectedOrder.routeGeoJson,
      progress: affectedOrder.progress ?? 50,
      costPrice: affectedOrder.costPrice,
      sellPrice: affectedOrder.sellPrice,
      internalBaseCost: affectedOrder.internalBaseCost,
      actualLogisticsCost: affectedOrder.actualLogisticsCost,
      buyers: affectedOrder.buyers,
      truck: affectedOrder.truck ? {
        id: affectedOrder.truck.id,
        driverName: affectedOrder.truck.driverName,
        vehicleType: affectedOrder.truck.vehicleType || "REFRIGERATED",
        status: affectedOrder.truck.status || "INCIDENT",
      } : null,
    }];
  }, [affectedOrder]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={cn(
        "rounded-xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col shadow-2xl",
        "bg-zinc-950 border border-zinc-800 ring-1 ring-white/5"
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-900/50 bg-red-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src={getHappyRobotLogo()}
                  alt="HappyRobot"
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <h2 className="text-lg font-bold text-red-400 tracking-tight">
                  HappyRobot Incident Response
                </h2>
              </div>
              <p className="text-[10px] text-red-400/70 font-mono mt-0.5">
                ID: {incident.id.slice(0, 8).toUpperCase()} • {incident.title.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content - Grid Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-12">
          {/* Left: Map (8 cols) */}
          <div className="col-span-8 border-r border-zinc-800 relative bg-zinc-900/50 flex flex-col">
            {/* Map Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                SAMSARA FLEET TRACKING
              </span>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
              {memoizedOrders.length > 0 ? (
                <FleetMap
                  orders={memoizedOrders}
                  incidentStatus="ACTIVE"
                  incidentDescription={incident.description}
                  onIncidentClick={() => {}}
                  viewMode="focused"
                  interactive={true}
                  serviceCenters={foundServiceCenters}
                  highlightedOrderId={affectedOrder?.id}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3 animate-pulse" />
                    <p className="text-zinc-400 font-mono text-sm">
                      {affectedOrder ? "ACQUIRING SATELLITE LOCK..." : "WAITING FOR TELEMETRY..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Intelligence Console (4 cols) */}
          <div className="col-span-4 flex flex-col bg-zinc-950 overflow-hidden">
            {/* Situation Report */}
            {incident.description && (
              <div className="p-4 border-b border-zinc-800 bg-red-950/10 shrink-0">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 font-mono font-bold">
                      Situation Analysis
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {incident.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Status Cards */}
            <div className="p-4 border-b border-zinc-800 shrink-0">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Active Agents
              </div>
              <div className="space-y-2">
                {agentsLoading ? (
                  <>
                    <AgentCardSkeleton />
                    <AgentCardSkeleton />
                  </>
                ) : (
                  <>
                    {supplierAgent ? (
                      <AgentCard agent={supplierAgent} />
                    ) : (
                      <div className="h-16 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
                        Supplier Agent Standby...
                      </div>
                    )}
                    {driverAgent ? (
                      <AgentCard agent={driverAgent} />
                    ) : (
                      <div className="h-16 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-600">
                        Driver Agent Standby...
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Live Logs Terminal */}
            <div className="flex-1 flex flex-col min-h-0 bg-black">
              {/* Terminal Header */}
              <div className="px-4 py-2 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3 w-3 text-zinc-500" />
                  <span className="text-[10px] font-mono text-zinc-400">
                    INCIDENT_LOGS // {incident.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
                </div>
              </div>

              {/* Log Stream */}
              <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                {logsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-2 items-start animate-pulse">
                        <div className="h-3 w-16 bg-zinc-800 rounded shrink-0" />
                        <div className="h-3 w-20 bg-zinc-800 rounded shrink-0" />
                        <div className="h-3 bg-zinc-800 rounded flex-1" style={{ maxWidth: `${50 + Math.random() * 40}%` }} />
                      </div>
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-zinc-600 flex items-center gap-2">
                    <span className="animate-pulse">_</span>
                    <span>Waiting for incident data...</span>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start hover:bg-zinc-900/50 px-1 py-0.5 rounded transition-colors">
                      <span className="text-zinc-600 shrink-0 w-16">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className={cn("shrink-0 font-bold text-[10px] uppercase", getSourceColor(log.source))}>
                        {log.source}:
                      </span>
                      <span className={getStatusColor(log.status)}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
                {/* Blinking cursor */}
                <div className="text-emerald-500 animate-pulse mt-2">_</div>
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
