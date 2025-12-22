"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { X, AlertTriangle, Terminal, Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePusher } from "./PusherProvider";
import { useTheme } from "./ThemeProvider";
import { FleetMap, ServiceCenter } from "./FleetMap";
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
  mode?: "live" | "historical"; // "live" for active incidents, "historical" for viewing from Agents page
}

// Resolution state for animated transition
interface ResolutionState {
  resolved: boolean;
  outcome: "SUCCESS" | "FAILED" | null;
  summary: string | null;
}

export function WarRoomModal({
  incident,
  affectedOrder,
  onClose,
  mode = "live",
}: WarRoomModalProps) {
  const { pusher } = usePusher();
  const { theme } = useTheme();

  // Determine if we're in historical mode (from prop or after resolution)
  const isInitiallyHistorical = mode === "historical" || incident.status !== "ACTIVE";

  // SWR hooks
  const { logs, isLoading: logsLoading, addLog } = useIncidentLogs(incident.id);
  const { agents, updateAgentStatus } = useAgents({ incidentId: incident.id });

  // Check if agents already exist for this incident (workflow already triggered)
  const hasExistingAgents = agents.length > 0;

  // Local UI state
  const [foundServiceCenters, setFoundServiceCenters] = useState<ServiceCenter[]>([]);
  const [foundDrivers, setFoundDrivers] = useState<DiscoveredDriver[]>([]);

  // Swarm State
  const [swarmActivated, setSwarmActivated] = useState(false);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);

  // Resolution state for animated transition (live → historical)
  const [resolution, setResolution] = useState<ResolutionState>({
    resolved: isInitiallyHistorical,
    outcome: isInitiallyHistorical
      ? incident.status === "RESOLVED"
        ? "SUCCESS"
        : "FAILED"
      : null,
    summary: null,
  });

  // Derived state: are we showing historical view?
  const isHistorical = resolution.resolved || isInitiallyHistorical;

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

  // 1. Check incident state and trigger discovery if needed (skip in historical mode)
  useEffect(() => {
    if (isInitiallyHistorical) return; // Skip discovery for historical viewing
    if (discoveryInitiatedRef.current) return;
    discoveryInitiatedRef.current = true;

    const initDiscovery = async () => {
      try {
        // First, check the incident's current discovery status
        const incidentRes = await fetch(`/api/incidents/${incident.id}`);
        if (!incidentRes.ok) {
          console.error("[War Room] Failed to fetch incident state");
          return;
        }
        const incidentData = await incidentRes.json();
        const discoveryStatus = incidentData.discoveryStatus;

        console.log(`[War Room] Current discovery status: ${discoveryStatus}`);

        // If discovery is already running or completed, don't trigger again
        if (discoveryStatus === "RUNNING") {
          console.log("[War Room] Discovery already running, waiting for Pusher events");
          return;
        }

        if (discoveryStatus === "COMPLETED") {
          console.log("[War Room] Discovery already complete, loading cached candidates");

          // Load cached candidates from incident data
          if (incidentData.candidates && Array.isArray(incidentData.candidates)) {
            const serviceCenters = incidentData.candidates
              .filter((c: { candidateType: string }) => c.candidateType === "SERVICE_CENTER" || c.candidateType === "WAREHOUSE")
              .map((c: { serviceCenter?: { id: string; name: string; lat: number; lng: number; type: string }; warehouse?: { id: string; name: string; lat: number; lng: number; type: string }; distance: number; rank: number }) => ({
                id: c.serviceCenter?.id || c.warehouse?.id,
                name: c.serviceCenter?.name || c.warehouse?.name,
                lat: c.serviceCenter?.lat || c.warehouse?.lat,
                lng: c.serviceCenter?.lng || c.warehouse?.lng,
                type: c.serviceCenter?.type || c.warehouse?.type,
                distance: c.distance,
                rank: c.rank,
              }));
            setFoundServiceCenters(serviceCenters);

            const drivers = incidentData.candidates
              .filter((c: { candidateType: string }) => c.candidateType === "DRIVER")
              .map((c: { truck?: { id: string; driverName: string }; currentLocation?: string; lat?: number; lng?: number; distance: number; status?: string; progress?: number; rank: number }) => ({
                id: c.truck?.id,
                driverName: c.truck?.driverName,
                currentLocation: c.currentLocation,
                lat: c.lat,
                lng: c.lng,
                distance: c.distance,
                status: c.status,
                progress: c.progress,
                rank: c.rank,
              }));
            setFoundDrivers(drivers);
          }

          setDiscoveryComplete(true);
          return;
        }

        // Discovery is PENDING, trigger it
        const res = await fetch(`/api/incidents/${incident.id}/discover`, {
          method: "POST",
        });
        const data = await res.json();

        // If discovery was already completed (race condition), load cached candidates
        if (data.status === "COMPLETED") {
          console.log("[War Room] Discovery just completed, loading candidates");

          if (data.candidates && Array.isArray(data.candidates)) {
            setFoundServiceCenters(data.candidates);
          }

          if (data.drivers && Array.isArray(data.drivers)) {
            setFoundDrivers(data.drivers);
          }

          setDiscoveryComplete(true);
        }
        // For STARTED/RUNNING, we rely on Pusher events for cinematic reveal
      } catch (error) {
        console.error("[War Room] Error initiating discovery:", error);
      }
    };

    initDiscovery();
  }, [incident.id, isInitiallyHistorical]);

  // 2. Pusher Listeners (skip in historical mode)
  useEffect(() => {
    if (!pusher) return;
    if (isInitiallyHistorical) return; // No real-time updates needed for historical viewing

    const channel = pusher.subscribe("sysco-demo");

    channel.bind(
      "incident-log",
      (data: {
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
      }
    );

    channel.bind(
      "agent-update",
      (data: { agentRole: string; status: string }) => {
        updateAgentStatus(data.agentRole, data.status);
      }
    );

    channel.bind(
      "resource-located",
      (data: { incidentId: string; serviceCenter: ServiceCenter }) => {
        if (data.incidentId !== incident.id) return;
        setFoundServiceCenters((prev) => {
          if (prev.find((sc) => sc.id === data.serviceCenter.id)) return prev;
          return [...prev, data.serviceCenter];
        });
      }
    );

    channel.bind(
      "driver-located",
      (data: { incidentId: string; driver: DiscoveredDriver }) => {
        if (data.incidentId !== incident.id) return;
        setFoundDrivers((prev) => {
          if (prev.find((d) => d.id === data.driver.id)) return prev;
          return [...prev, data.driver];
        });
      }
    );

    channel.bind("discovery-complete", (data: { incidentId: string }) => {
      if (data.incidentId !== incident.id) return;
      console.log("[War Room] Discovery complete, ready to trigger swarm");
      setDiscoveryComplete(true);
    });

    // Handle demo completion - animate transition to historical mode
    channel.bind(
      "demo-complete",
      (data: {
        incident: { id: string; status: string };
        outcome: "SUCCESS" | "FAILED";
        summary: string;
        timestamp: string;
      }) => {
        if (data.incident.id !== incident.id) return;
        console.log(`[War Room] Resolution received - Outcome: ${data.outcome}`);

        // Trigger animated transition to historical mode
        setResolution({
          resolved: true,
          outcome: data.outcome,
          summary: data.summary,
        });
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher, incident.id, addLog, updateAgentStatus, isInitiallyHistorical]);

  // 3. Automatic Swarm Trigger (skip in historical mode or if agents already exist)
  // Wait for the server to confirm discovery is complete via Pusher event
  useEffect(() => {
    if (isInitiallyHistorical) return; // Don't trigger swarm for historical viewing
    if (hasExistingAgents) {
      console.log("[War Room] Agents already exist for this incident, skipping swarm trigger");
      return;
    }

    const triggerSwarm = async () => {
      if (!discoveryComplete || swarmActivated) return;

      setSwarmActivated(true); // Prevent double firing

      try {
        const centerPhone =
          typeof window !== "undefined"
            ? localStorage.getItem("demo_center_phone") || ""
            : "";
        const truckerPhone =
          typeof window !== "undefined"
            ? localStorage.getItem("demo_trucker_phone") || ""
            : "";

        // Log the auto-trigger
        addLog({
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          message: "Resources identified. Deploying HappyRobot AI Agent.",
          source: "ORCHESTRATOR",
          status: "INFO",
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
  }, [discoveryComplete, swarmActivated, incident.id, addLog, isInitiallyHistorical, hasExistingAgents]);


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
        {/* Header - Animated transition between live and resolved states */}
        <motion.div
          className={cn(
            "px-6 py-4 border-b flex items-center justify-between shrink-0 transition-colors duration-500",
            isHistorical
              ? resolution.outcome === "SUCCESS"
                ? "border-emerald-900/30 bg-emerald-950/10"
                : resolution.outcome === "FAILED"
                ? "border-red-900/30 bg-red-950/10"
                : "border-zinc-800 bg-zinc-900/20"
              : "border-red-900/30 bg-red-950/10"
          )}
          layout
        >
          <div className="flex items-center gap-4">
            {/* Status Indicator - Animated */}
            <AnimatePresence mode="wait">
              {isHistorical ? (
                <motion.div
                  key="resolved"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {resolution.outcome === "SUCCESS" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : resolution.outcome === "FAILED" ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-zinc-500" />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="live"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative flex h-3 w-3"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <div className="flex items-center gap-2">
                <Image
                  src={getHappyRobotLogo()}
                  alt="HappyRobot"
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <motion.h2
                  className={cn(
                    "text-lg font-bold tracking-tight transition-colors duration-500",
                    isHistorical
                      ? resolution.outcome === "SUCCESS"
                        ? "text-emerald-500"
                        : resolution.outcome === "FAILED"
                        ? "text-red-500"
                        : "text-zinc-400"
                      : "text-red-500"
                  )}
                  layout
                >
                  {isHistorical
                    ? resolution.outcome === "SUCCESS"
                      ? "INCIDENT RESOLVED"
                      : resolution.outcome === "FAILED"
                      ? "RESOLUTION FAILED"
                      : "INCIDENT ARCHIVE"
                    : "AUTONOMOUS RESOLUTION"}
                </motion.h2>
              </div>
              <p
                className={cn(
                  "text-[10px] font-mono mt-0.5 transition-colors duration-500",
                  isHistorical
                    ? resolution.outcome === "SUCCESS"
                      ? "text-emerald-400/70"
                      : resolution.outcome === "FAILED"
                      ? "text-red-400/70"
                      : "text-zinc-500"
                    : "text-red-400/70"
                )}
              >
                INCIDENT ID: {incident.id.slice(0, 8).toUpperCase()}
                {isHistorical && ` • ${incident.status}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>

        {/* Resolution Banner - Shows when resolved */}
        <AnimatePresence>
          {isHistorical && resolution.summary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "px-6 py-3 flex items-center gap-3 border-b overflow-hidden",
                resolution.outcome === "SUCCESS"
                  ? "bg-emerald-950/20 border-emerald-900/30"
                  : "bg-red-950/20 border-red-900/30"
              )}
            >
              {resolution.outcome === "SUCCESS" ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  resolution.outcome === "SUCCESS"
                    ? "text-emerald-300"
                    : "text-red-300"
                )}
              >
                {resolution.summary}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content - Grid Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-12">
          
          {/* Left: Map (8 cols) - Styling Updated for Square corners except bottom-left */}
          <div className="col-span-8 border-r border-zinc-800 relative bg-zinc-900/20 flex flex-col">
            
            {/* Map Container */}
            <div className="flex-1 relative rounded-bl-xl overflow-hidden">
              {memoizedOrders.length > 0 ? (
                <FleetMap
                  orders={memoizedOrders}
                  incidentStatus={isHistorical ? "RESOLVED" : "ACTIVE"}
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
                {/* Activity Indicator - Static in historical mode */}
                <div className="flex gap-1.5">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isHistorical ? "bg-zinc-700" : "bg-zinc-700 animate-pulse"
                    )}
                  />
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isHistorical
                        ? "bg-zinc-700"
                        : "bg-zinc-700 animate-pulse delay-75"
                    )}
                  />
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isHistorical
                        ? "bg-zinc-700"
                        : "bg-zinc-700 animate-pulse delay-150"
                    )}
                  />
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

                {/* Active cursor at bottom - Hidden in historical mode */}
                {!isHistorical && (
                  <div className="flex items-center gap-2 text-zinc-600 pt-2">
                    <span className="text-emerald-500 animate-pulse">_</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}