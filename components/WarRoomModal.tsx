"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { X, AlertTriangle, Terminal, Activity } from "lucide-react";
import { usePusher } from "./PusherProvider";
import { useTheme } from "./ThemeProvider";
import { FleetMap, ServiceCenter } from "./FleetMap";
import { EmailToast } from "./EmailToast";
import { cn } from "@/lib/utils";
import { useIncidentLogs, useAgents } from "@/hooks";
import type { IncidentLog } from "@/hooks";

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

// Discovered driver for trailer relay
interface DiscoveredDriver {
  id: string;
  orderId: string;
  driverName: string;
  truckId: string;
  currentLocation: string;
  lat: number;
  lng: number;
  distance: number;
  status: "DELIVERED" | "COMPLETING";
  progress?: number;
  nearestDropOff?: {
    id: string;
    name: string;
    distance: number;
  };
  rank?: number;
}

interface WarRoomModalProps {
  incident: Incident;
  affectedOrder?: AffectedOrder | null;
  onClose: () => void;
}

export function WarRoomModal({ incident, affectedOrder, onClose }: WarRoomModalProps) {
  const { pusher } = usePusher();
  const { theme } = useTheme();

  // SWR hooks
  const { logs, isLoading: logsLoading, addLog } = useIncidentLogs(incident.id);
  const { updateAgentStatus } = useAgents({ incidentId: incident.id });

  // Local UI state
  const [showEmailToast, setShowEmailToast] = useState(false);
  const [foundServiceCenters, setFoundServiceCenters] = useState<ServiceCenter[]>([]);
  const [foundDrivers, setFoundDrivers] = useState<DiscoveredDriver[]>([]);
  
  // Swarm State
  const [swarmActivated, setSwarmActivated] = useState(false);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const discoveryInitiatedRef = useRef(false);

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

  // 1. Trigger Discovery on Mount
  useEffect(() => {
    if (discoveryInitiatedRef.current) return;
    discoveryInitiatedRef.current = true;

    const initDiscovery = async () => {
      try {
        const res = await fetch(`/api/incidents/${incident.id}/discover`, { method: "POST" });
        const data = await res.json();

        // If discovery was already completed, load cached candidates
        if (data.status === "COMPLETED") {
          console.log("[War Room] Discovery already complete, loading cached candidates");

          // Load cached service centers/warehouses
          if (data.candidates && Array.isArray(data.candidates)) {
            setFoundServiceCenters(data.candidates);
          }

          // Load cached drivers
          if (data.drivers && Array.isArray(data.drivers)) {
            setFoundDrivers(data.drivers);
          }

          // Mark discovery as complete so swarm can trigger
          setDiscoveryComplete(true);
        }
        // For STARTED/RUNNING, we rely on Pusher events for cinematic reveal
      } catch (error) {
        console.error("[War Room] Error initiating discovery:", error);
      }
    };

    initDiscovery();
  }, [incident.id]);

  // 2. Pusher Listeners
  useEffect(() => {
    if (!pusher) return;
    const channel = pusher.subscribe("sysco-demo");

    channel.bind("incident-log", (data: {
      incidentId: string;
      log: IncidentLog;
      selected_facility_id?: string;
      selected_driver_id?: string;
    }) => {
      if (data.incidentId !== incident.id) return;
      addLog(data.log);

      // If a facility was selected, filter to only show that one
      if (data.selected_facility_id) {
        setFoundServiceCenters((prev) =>
          prev.filter((sc) => sc.id === data.selected_facility_id)
        );
      }

      // If a driver was selected, filter to only show that one
      if (data.selected_driver_id) {
        setFoundDrivers((prev) =>
          prev.filter((d) => d.id === data.selected_driver_id)
        );
      }
    });

    channel.bind("agent-update", (data: { agentRole: string; status: string }) => {
      updateAgentStatus(data.agentRole, data.status);
    });

    channel.bind("resource-located", (data: { incidentId: string; serviceCenter: ServiceCenter }) => {
      if (data.incidentId !== incident.id) return;
      setFoundServiceCenters((prev) => {
        if (prev.find((sc) => sc.id === data.serviceCenter.id)) return prev;
        return [...prev, data.serviceCenter];
      });
    });

    channel.bind("driver-located", (data: { incidentId: string; driver: DiscoveredDriver }) => {
      if (data.incidentId !== incident.id) return;
      setFoundDrivers((prev) => {
        if (prev.find((d) => d.id === data.driver.id)) return prev;
        return [...prev, data.driver];
      });
    });

    channel.bind("demo-complete", () => {
      setShowEmailToast(true);
    });

    channel.bind("discovery-complete", (data: { incidentId: string }) => {
      if (data.incidentId !== incident.id) return;
      console.log("[War Room] Discovery complete, ready to trigger swarm");
      setDiscoveryComplete(true);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher, incident.id, addLog, updateAgentStatus]);

  // 3. Automatic Swarm Trigger
  // Wait for the server to confirm discovery is complete via Pusher event
  useEffect(() => {
    const triggerSwarm = async () => {
      if (!discoveryComplete || swarmActivated) return;
      
      setSwarmActivated(true); // Prevent double firing
      
      try {
        const centerPhone = typeof window !== "undefined" ? localStorage.getItem("demo_center_phone") || "" : "";
        const truckerPhone = typeof window !== "undefined" ? localStorage.getItem("demo_trucker_phone") || "" : "";

        // Log the auto-trigger
        addLog({
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          message: "Resources identified. Deploying HappyRobot AI Agent.",
          source: "ORCHESTRATOR",
          status: "INFO"
        });

        await fetch("/api/happyrobot/trigger_workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incident_id: incident.id,
            center_phone: centerPhone,
            trucker_phone: truckerPhone,
          }),
        });
      } catch (error) {
        console.error("Swarm trigger failed", error);
      }
    };

    triggerSwarm();
  }, [discoveryComplete, swarmActivated, incident.id, addLog]);


  // Helper styles
  const getSourceColor = (source: string) => {
    if (source === "SYSTEM") return "text-zinc-500";
    if (source === "DISCOVERY") return "text-blue-400";
    // ORCHESTRATOR and all AGENT:* sources are purple (HappyRobot agents)
    if (source === "ORCHESTRATOR" || source.startsWith("AGENT:")) return "text-purple-400";
    return "text-zinc-400";
  };

  const getStatusColor = (status: string) => {
    if (status === "SUCCESS") return "text-emerald-300";
    if (status === "WARNING") return "text-amber-300";
    if (status === "ERROR") return "text-red-300";
    return "text-zinc-300";
  };

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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={cn(
        "w-[95vw] h-[90vh] overflow-hidden flex flex-col shadow-2xl",
        "bg-zinc-950 border border-zinc-800 rounded-xl" 
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-900/30 bg-red-950/10 flex items-center justify-between shrink-0">
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
                <h2 className="text-lg font-bold text-red-500 tracking-tight">
                  AUTONOMOUS RESOLUTION
                </h2>
              </div>
              <p className="text-[10px] text-red-400/70 font-mono mt-0.5">
                INCIDENT ID: {incident.id.slice(0, 8).toUpperCase()}
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
          
          {/* Left: Map (8 cols) - Styling Updated for Square corners except bottom-left */}
          <div className="col-span-8 border-r border-zinc-800 relative bg-zinc-900/20 flex flex-col">
            
            {/* Map Container */}
            <div className="flex-1 relative rounded-bl-xl overflow-hidden">
              {memoizedOrders.length > 0 ? (
                <FleetMap
                  orders={memoizedOrders}
                  incidentStatus="ACTIVE"
                  incidentDescription={incident.description}
                  onIncidentClick={() => {}}
                  viewMode="focused"
                  interactive={true}
                  serviceCenters={foundServiceCenters}
                  availableDrivers={foundDrivers}
                  highlightedOrderId={affectedOrder?.id}
                />
              ) : (
                <div className="flex items-center justify-center h-full flex-col gap-3">
                  <Activity className="h-10 w-10 text-red-500/50 animate-pulse" />
                  <p className="text-zinc-500 font-mono text-xs tracking-widest">
                    AWAITING TELEMETRY LINK...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Intelligence Console (4 cols) - Fixed height, scrollable logs */}
          <div className="col-span-4 flex flex-col bg-zinc-950 overflow-hidden">
            
            {/* Situation Report */}
            {incident.description && (
              <div className="p-5 border-b border-zinc-900 bg-zinc-900/30 shrink-0">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-red-400 uppercase tracking-widest mb-2 font-mono font-bold">
                      Critical Failure
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {incident.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Logs Terminal - Now takes up ALL remaining space */}
            <div className="flex-1 flex flex-col min-h-0 bg-black">
              {/* Terminal Header */}
              <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-zinc-500" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    Execution Log
                  </span>
                </div>
                {/* Activity Indicator */}
                <div className="flex gap-1.5">
                   <div className="h-1.5 w-1.5 rounded-full bg-zinc-700 animate-pulse" />
                   <div className="h-1.5 w-1.5 rounded-full bg-zinc-700 animate-pulse delay-75" />
                   <div className="h-1.5 w-1.5 rounded-full bg-zinc-700 animate-pulse delay-150" />
                </div>
              </div>

              {/* Log Stream - scrollable container */}
              <div className="flex-1 min-h-0 p-4 overflow-y-auto font-mono text-[11px] space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {logsLoading ? (
                  <div className="space-y-3 opacity-50">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-4 bg-zinc-800 rounded w-1/2" />
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-zinc-600 flex items-center gap-2 mt-2">
                    <span className="text-emerald-500 animate-pulse">{">"}</span>
                    <span>System ready. Waiting for event stream...</span>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="group flex gap-3 items-start opacity-90 hover:opacity-100 transition-opacity">
                      <span className="text-zinc-600 shrink-0 w-[60px] tabular-nums text-[10px] pt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <div className="flex-1 border-l-2 border-zinc-800 pl-3 group-hover:border-zinc-700 transition-colors">
                        <div className={cn("font-bold text-[9px] uppercase tracking-wider mb-0.5", getSourceColor(log.source))}>
                          {log.source}
                        </div>
                        <div className={cn("leading-relaxed", getStatusColor(log.status))}>
                          {log.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
                
                {/* Active cursor at bottom */}
                <div className="flex items-center gap-2 text-zinc-600 pt-2">
                   <span className="text-emerald-500 animate-pulse">_</span>
                </div>
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