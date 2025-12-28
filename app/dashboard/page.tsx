"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePusher } from "@/components/PusherProvider";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExpandableGrid,
  ExpandableGridItem,
  CollapsibleSection,
  AnimatedColumn,
  gsap,
  type ExpandableGridRef,
} from "@/components/gsap";
import {
  TrendingUp,
  Package,
  ArrowRight,
  Activity,
  Search,
  X,
  DollarSign,
} from "lucide-react";
import { WarRoomModal } from "@/components/WarRoomModal";
import { FilterDropdown } from "@/components/FilterDropdown";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import {
  useOrders,
  useIncidents,
  useWarehouses,
  revalidateOrders,
  revalidateIncidents,
  mutateIncident,
} from "@/hooks";
import type { Order, Incident, Warehouse } from "@/hooks";

// Dynamic import for FleetMap to avoid SSR issues with Mapbox
const FleetMap = dynamic(
  () => import("@/components/FleetMap").then((mod) => mod.FleetMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-xl border border-[var(--sysco-border)] bg-[var(--sysco-card)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">LOADING MAP...</span>
        </div>
      </div>
    ),
  }
);

// Types are now imported from @/hooks

export default function DashboardPage() {
  const { pusher } = usePusher();
  const { theme } = useTheme();

  // --- STATE MANAGEMENT ---
  // 1. Server State via SWR (Source of Truth from DB)
  const { orders: serverOrders, isLoading: ordersLoading, addOrder } = useOrders();
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const { activeIncident, incidents, isLoading: incidentsLoading } = useIncidents();

  // Use activeIncident from SWR, but allow local override for optimistic updates
  const [localIncident, setLocalIncident] = useState<Incident | null>(null);
  const incident = localIncident ?? activeIncident;

  // 2. Simulation State (Visual Overrides - decoupled from server)
  // This is the key fix: we track the animated risk score SEPARATELY
  // so server fetches don't fight with the local animation.
  // We also store the full orderData as a fallback for viewers who receive via Pusher.
  const [simulation, setSimulation] = useState<{
    active: boolean;
    orderId: string | null;
    orderData: Order | null; // Backup data source for viewers
    currentRiskScore: number;
  }>({ active: false, orderId: null, orderData: null, currentRiskScore: 0 });

  // 3. UI State
  const [showWarRoom, setShowWarRoom] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Historical War Room state (for viewing resolved incidents from order clicks)
  const [historicalIncident, setHistoricalIncident] = useState<Incident | null>(null);
  const [historicalOrder, setHistoricalOrder] = useState<Order | null>(null);
  const [showHistoricalWarRoom, setShowHistoricalWarRoom] = useState(false);
  const [loadingHistoricalIncident, setLoadingHistoricalIncident] = useState(false);

  // Combined loading state
  const isLoading = ordersLoading || warehousesLoading || incidentsLoading;

  // Table interaction state
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const tableHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const expandableGridRef = useRef<ExpandableGridRef>(null);
  const tableRowsRef = useRef<HTMLDivElement>(null);
  const isClearingFiltersRef = useRef(false);
  const prevFilteredCountRef = useRef(0);

  // Calculate price range from serverOrders
  const priceStats = serverOrders.length > 0 ? {
    min: Math.floor(Math.min(...serverOrders.map((o: Order) => o.sellPrice || o.orderValue || 0)) / 1000) * 1000,
    max: Math.ceil(Math.max(...serverOrders.map((o: Order) => o.sellPrice || o.orderValue || 0)) / 1000) * 1000,
  } : { min: 0, max: 100000 };

  const currentPriceMin = priceRange?.min ?? priceStats.min;
  const currentPriceMax = priceRange?.max ?? priceStats.max;

  // Determine map status - check for ACTIVE incident first, then RESOLVED
  // When incident is resolved, activeIncident becomes null, so we need to check
  // the full incidents array for a RESOLVED incident matching our simulation.orderId
  const resolvedIncident = simulation.orderId
    ? incidents.find(inc => inc.orderId === simulation.orderId && (inc.status === "RESOLVED" || inc.status === "FAILED"))
    : null;

  const mapStatus: "IDLE" | "ACTIVE" | "RESOLVED" =
    incident?.status === "ACTIVE" ? "ACTIVE" :
    incident?.status === "RESOLVED" ? "RESOLVED" :
    resolvedIncident ? "RESOLVED" : "IDLE";

  // --- DERIVED STATE: Service Level ---
  // Calculate service level from orders (derived, not stored)
  const serviceLevel = useMemo(() => {
    if (serverOrders.length === 0) return 100;
    const problematicOrders = serverOrders.filter(
      (o) => o.status === "CANCELLED" || o.status === "AT_RISK"
    ).length;
    const level = ((serverOrders.length - problematicOrders) / serverOrders.length) * 100;
    return Math.round(level * 10) / 10;
  }, [serverOrders]);

  // --- DERIVED STATE: THE MERGER ---
  // This is the Magic Fix. We merge Server Data + Simulation Data on the fly.
  // If a simulation is active, the UI ignores the server's risk score for that specific order
  // and uses the local animation score instead. This guarantees 100% smoothness.
  const displayOrders = useMemo(() => {
    return serverOrders.map(order => {
      // If this is the order being simulated, override its risk data
      if (simulation.active && order.id === simulation.orderId) {
        return {
          ...order,
          riskScore: Math.max(order.riskScore, simulation.currentRiskScore),
          // Force status update based on the LOCAL animation score, not the server status
          status: simulation.currentRiskScore > 75 ? "AT_RISK" : order.status
        };
      }
      return order;
    });
  }, [serverOrders, simulation]);

  // Derived: The affected order for the War Room
  // Try finding it in the live list first (for live position updates).
  // If not found, use the backup 'orderData' from the simulation state.
  const affectedOrder = useMemo(() => {
    if (!simulation.orderId) return null;

    // First try to find in the live display orders
    const liveOrder = displayOrders.find(o => o.id === simulation.orderId);

    // Fallback to the snapshot we got from Pusher if not in the list yet
    const fallbackOrder = simulation.orderData;

    // Use live data if available, otherwise use fallback
    const baseOrder = liveOrder || fallbackOrder;

    if (!baseOrder) return null;

    // Merge with simulation overrides for risk display
    return {
      ...baseOrder,
      riskScore: Math.max(baseOrder.riskScore, simulation.currentRiskScore),
      status: simulation.currentRiskScore > 75 ? "AT_RISK" : baseOrder.status
    };
  }, [displayOrders, simulation]);

  const getManhattanLogo = () => {
    return theme === "dark"
      ? "/manhattan/manhattan_tms_white.png"
      : "/manhattan/mahnattan_tms_black.svg";
  };

  // Close historical War Room
  const handleCloseHistoricalWarRoom = () => {
    setShowHistoricalWarRoom(false);
    setHistoricalIncident(null);
    setHistoricalOrder(null);
  };

  // Restore simulation state when activeIncident loads (e.g., page refresh)
  useEffect(() => {
    if (activeIncident && activeIncident.orderId && !simulation.active) {
      const affectedOrderData = serverOrders.find((o) => o.id === activeIncident.orderId);
      setShowBanner(true);
      setSimulation({
        active: true,
        orderId: activeIncident.orderId,
        orderData: affectedOrderData || null,
        currentRiskScore: affectedOrderData?.riskScore || 100,
      });
      setHighlightedOrderId(activeIncident.orderId);
    }
  }, [activeIncident, serverOrders, simulation.active]);

  useEffect(() => {
    if (!pusher) {
      console.warn("[Pusher] No pusher client available - check NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER env vars");
      return;
    }

    console.log("[Pusher] Subscribing to sysco-demo channel");
    const channel = pusher.subscribe("sysco-demo");

    // Refetch to catch any events we might have missed before Pusher connected
    revalidateOrders();
    revalidateIncidents();

    // Also refetch when Pusher reconnects after a disconnect
    const handleConnected = () => {
      console.log("[Pusher] Connection established/restored - refetching data");
      revalidateOrders();
      revalidateIncidents();
    };
    pusher.connection.bind("connected", handleConnected);

    channel.bind("demo-started", (data: { incident: Incident; affectedOrderId?: string; affectedOrder?: Order }) => {
      // 1. Set Incident (local for immediate update + SWR for cache)
      setLocalIncident(data.incident);
      mutateIncident(data.incident);

      // 2. Optimistic Data Update via SWR
      // If the order comes in the payload, inject it into cache immediately.
      if (data.affectedOrder) {
        addOrder(data.affectedOrder);
      }

      // 3. Trigger Simulation State (Critical Fix for Viewers)
      if (data.affectedOrderId) {
        setHighlightedOrderId(data.affectedOrderId);

        // This populates 'affectedOrder' for the War Room by setting simulation.orderId
        // We also store the full orderData as a fallback for viewers
        setSimulation({
          active: true,
          orderId: data.affectedOrderId,
          orderData: data.affectedOrder || null,
          currentRiskScore: 100,
        });
      }

      // 4. Show Banner with slight delay for dramatic effect
      setTimeout(() => setShowBanner(true), 1000);

      // 5. Background Refresh via SWR (will dedupe if already fetching)
      revalidateOrders();
    });

    channel.bind("agent-update", () => {
      // Use SWR revalidation instead of manual fetch
      revalidateOrders();
    });

    channel.bind(
      "demo-complete",
      (data: {
        incident: Incident;
        outcome: "SUCCESS" | "FAILED";
        summary: string;
        timestamp: string;
      }) => {
        console.log(`[Pusher] Demo complete - Outcome: ${data.outcome}`);

        // Immediately update the incident in SWR cache with resolved status
        // This ensures UI updates instantly without waiting for revalidation
        mutateIncident({
          ...data.incident,
          status: data.outcome === "SUCCESS" ? "RESOLVED" : "FAILED",
        });

        // Clear war mode state on dashboard (banner, simulation, highlighting)
        // BUT preserve orderId so the purple "resolved" marker can render
        setLocalIncident(null);
        setShowBanner(false);
        setSimulation(prev => ({
          active: false,
          orderId: prev.orderId,      // Keep for purple marker display
          orderData: prev.orderData,  // Keep for reference
          currentRiskScore: 0,
        }));
        setHighlightedOrderId(null);

        // NOTE: Do NOT close showWarRoom - let WarRoomModal handle its own
        // animated transition from live to historical mode

        // Revalidate data via SWR to sync with server
        revalidateOrders();
        revalidateIncidents();
      }
    );

    // --- Prisma Middleware Events (auto-broadcast from DB changes) ---
    // These ensure real-time sync even when explicit events aren't sent

    // Bulk order updates (e.g., from reset endpoint)
    channel.bind("orders:bulk-updated", () => {
      console.log("[Pusher] Orders bulk-updated via Prisma middleware");
      revalidateOrders();
    });

    // Bulk order deletes
    channel.bind("orders:bulk-deleted", () => {
      console.log("[Pusher] Orders bulk-deleted via Prisma middleware");
      revalidateOrders();
    });

    // Single order updates (granular real-time sync)
    channel.bind("order:updated", () => {
      console.log("[Pusher] Order updated via Prisma middleware");
      revalidateOrders();
    });

    // Incidents cleared (from reset or resolution)
    channel.bind("incidents:bulk-deleted", () => {
      console.log("[Pusher] Incidents bulk-deleted via Prisma middleware");
      setLocalIncident(null);
      setShowBanner(false);
      setSimulation({ active: false, orderId: null, orderData: null, currentRiskScore: 0 });
      setHighlightedOrderId(null);
      revalidateIncidents();
    });

    // Incident updated (status change, resolution, etc.)
    channel.bind("incident:updated", (data: { incident: Incident }) => {
      console.log("[Pusher] Incident updated via Prisma middleware:", data.incident.status);
      // If incident is resolved/failed, clear war mode state
      // BUT preserve orderId so the purple "resolved" marker can render
      if (data.incident.status === "RESOLVED" || data.incident.status === "FAILED") {
        setLocalIncident(null);
        setShowBanner(false);
        setSimulation(prev => ({
          active: false,
          orderId: prev.orderId,      // Keep for purple marker display
          orderData: prev.orderData,  // Keep for reference
          currentRiskScore: 0,
        }));
        setHighlightedOrderId(null);
      }
      revalidateIncidents();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
      pusher.connection.unbind("connected", handleConnected);
    };
  }, [pusher, addOrder]);


  const statusConfig: Record<
    string,
    { bg: string; text: string; dot: string; border: string; label: string }
  > = {
    CONFIRMED: {
      bg: "bg-[var(--status-warn-bg)]",
      text: "text-[var(--status-warn-text)]",
      dot: "bg-amber-500",
      border: "border-[var(--status-warn-border)]",
      label: "Pending Pickup",
    },
    IN_TRANSIT: {
      bg: "bg-[var(--status-info-bg)]",
      text: "text-[var(--status-info-text)]",
      dot: "bg-blue-500",
      border: "border-[var(--status-info-border)]",
      label: "In Transit",
    },
    AT_RISK: {
      bg: "bg-[var(--status-error-bg)]",
      text: "text-[var(--status-error-text)]",
      dot: "bg-red-500 animate-pulse",
      border: "border-[var(--status-error-border)]",
      label: "At Risk",
    },
    DELIVERED: {
      bg: "bg-[var(--status-success-bg)]",
      text: "text-[var(--status-success-text)]",
      dot: "bg-emerald-500",
      border: "border-[var(--status-success-border)]",
      label: "Delivered",
    },
    CANCELLED: {
      bg: "bg-[var(--status-error-bg)]",
      text: "text-[var(--status-error-text)]",
      dot: "bg-red-500",
      border: "border-[var(--status-error-border)]",
      label: "Cancelled",
    },
    RECOVERING: {
      bg: "bg-[var(--status-warn-bg)]",
      text: "text-[var(--status-warn-text)]",
      dot: "bg-amber-500 animate-pulse",
      border: "border-[var(--status-warn-border)]",
      label: "Recovering",
    },
  };

  const getStatusConfig = (status: string) =>
    statusConfig[status] || {
      bg: "bg-zinc-500/10",
      text: "text-zinc-600 dark:text-zinc-400",
      dot: "bg-zinc-500",
      border: "border-zinc-500/30",
      label: status.replace('_', ' '),
    };

  const uniqueOrigins = [...new Set(displayOrders.map(o => o.origin.split(',')[0]))].sort();
  const uniqueDestinations = [...new Set(displayOrders.map(o => o.destination.split(',')[0]))].sort();

  const filteredOrders = displayOrders.filter(order => {
    const matchesSearch = searchQuery === "" ||
      order.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.carrier.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOrigin = originFilter === "" || order.origin.split(',')[0] === originFilter;
    const matchesDestination = destinationFilter === "" || order.destination.split(',')[0] === destinationFilter;

    const orderPrice = order.sellPrice || order.orderValue || 0;
    const matchesPrice = orderPrice >= currentPriceMin && orderPrice <= currentPriceMax;

    return matchesSearch && matchesOrigin && matchesDestination && matchesPrice;
  });

  // Animate table rows when filters change
  useEffect(() => {
    if (!tableRowsRef.current) return;
    const rows = tableRowsRef.current.querySelectorAll("[data-row-id]");
    if (rows.length === 0) return;

    const currentCount = rows.length;
    const prevCount = prevFilteredCountRef.current;
    const isClearing = isClearingFiltersRef.current;

    // Reset clearing flag after reading it
    isClearingFiltersRef.current = false;
    prevFilteredCountRef.current = currentCount;

    // Different animation strategies based on action type
    if (isClearing || (currentCount > prevCount && currentCount - prevCount > 5)) {
      // "Clear filters" or large increase: smooth collective fade (no waterfall)
      gsap.fromTo(
        rows,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.35,
          ease: "power2.out",
        }
      );
    } else {
      // Normal filtering: staggered slide-in animation
      gsap.fromTo(
        rows,
        { opacity: 0, y: -8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          stagger: 0.02,
          ease: "power2.out",
        }
      );
    }
  }, [filteredOrders.length, searchQuery, originFilter, destinationFilter, priceRange]);

  const resetFilters = () => {
    // Set flag so animation effect knows this is a "clear all" action
    isClearingFiltersRef.current = true;
    setSearchQuery("");
    setOriginFilter("");
    setDestinationFilter("");
    setPriceRange(null);
  };

  const hasPriceFilter = priceRange !== null && (priceRange.min > priceStats.min || priceRange.max < priceStats.max);
  const hasActiveFilters = searchQuery !== "" || originFilter !== "" || destinationFilter !== "" || hasPriceFilter;

  const handleTableMouseEnter = () => {
    if (tableHoverTimeoutRef.current) {
      clearTimeout(tableHoverTimeoutRef.current);
      tableHoverTimeoutRef.current = null;
    }
    // Capture Flip state BEFORE React updates the DOM
    expandableGridRef.current?.captureState();
    setIsTableExpanded(true);
  };

  const handleTableMouseLeave = () => {
    if (tableHoverTimeoutRef.current) {
      clearTimeout(tableHoverTimeoutRef.current);
    }
    tableHoverTimeoutRef.current = setTimeout(() => {
      // Capture Flip state BEFORE React updates the DOM
      expandableGridRef.current?.captureState();
      setIsTableExpanded(false);
    }, 200);
  };

  const handleOrderClick = async (order: Order) => {
    const orderId = order.id;

    // Toggle highlighting
    setHighlightedOrderId(prev => prev === orderId ? null : orderId);

    // Check if this order has an associated resolved/failed incident
    const incidentForOrder = incidents.find(
      (inc) => inc.orderId === orderId && inc.status !== "ACTIVE"
    );

    if (incidentForOrder) {
      // Fetch full incident data for historical War Room
      setLoadingHistoricalIncident(true);
      try {
        const res = await fetch(`/api/incidents/${incidentForOrder.id}`);
        if (!res.ok) throw new Error("Failed to fetch incident");

        const fullIncident = await res.json();
        setHistoricalIncident(fullIncident);
        setHistoricalOrder(order);
        setShowHistoricalWarRoom(true);
      } catch (error) {
        console.error("Error fetching historical incident:", error);
      } finally {
        setLoadingHistoricalIncident(false);
      }
    }
  };

  const handleMapOrderSelect = (orderId: string | null) => {
    setHighlightedOrderId(orderId);
  };

 // --- FINANCIAL CALCULATIONS ---
  // Use displayOrders (merged state) for stable calculations
  // 1. Total Pipeline Revenue (Sum of all active orders)
  const totalPipelineValue = displayOrders.reduce((acc, order) => {
    return acc + (order.sellPrice || order.orderValue || 0);
  }, 0);

  // 2. Total Exposure at Risk (Revenue + Product Cost)
  // Now uses displayOrders which already has simulation state merged in
  const atRiskOrders = displayOrders.filter((o) =>
    o.status === "CANCELLED" ||
    o.status === "AT_RISK" ||
    o.riskScore > 75
  );

  const revenueAtRisk = atRiskOrders.reduce((acc, order) => {
    return acc + (order.sellPrice || order.orderValue || 0);
  }, 0);

  const productCostAtRisk = atRiskOrders.reduce((acc, order) => {
    return acc + (order.costPrice || 0);
  }, 0);

  const totalExposure = revenueAtRisk + productCostAtRisk;

  // 3. Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
      notation: val > 1000000 ? "compact" : "standard",
    }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sysco-bg)]">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">INITIALIZING SYSTEMS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--sysco-bg)] overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-none z-30 bg-[var(--sysco-bg)]/80 backdrop-blur-xl border-b border-[var(--sysco-border)]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
              Texas Command Center
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5 font-mono">
              REAL-TIME SUPPLY CHAIN MONITORING
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4 overflow-hidden">
        {/* Critical Incident Banner - Using Framer Motion */}
        <AnimatePresence mode="wait">
          {showBanner && incident && (
            <motion.div
              key="incident-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div
                onClick={() => setShowWarRoom(true)}
                className={cn(
                  "overflow-hidden rounded-xl cursor-pointer",
                  "border bg-[var(--status-error-bg)] border-[var(--status-error-border)] backdrop-blur-sm",
                  "transition-all duration-300 hover:border-red-500 dark:hover:border-red-700"
                )}
              >
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--status-error-text)] uppercase tracking-wide">
                        CRITICAL INCIDENT DETECTED
                      </h2>
                      <p className="text-xs text-[var(--status-error-text)] opacity-80 font-mono mt-0.5">
                        ID: {incident.id.slice(0, 8).toUpperCase()} • {incident.title.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button className="group flex items-center gap-2 rounded-lg border border-[var(--status-error-border)] bg-red-500/10 dark:bg-red-900/50 px-4 py-2 text-xs font-medium text-[var(--status-error-text)] hover:bg-red-500/20 dark:hover:bg-red-900 transition-colors animate-pulse">
                    <img
                      src="/happyrobot/Footer-logo-white.png"
                      alt="HappyRobot"
                      className="h-3 w-auto opacity-70" 
                    />
                    Launch HappyRobot War Room
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
                <div className="h-1 w-full bg-red-200 dark:bg-red-900/50">
                  <div className="h-full w-1/3 animate-pulse bg-red-500/70" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Strip */}
        <div className="flex-none grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={cn(
              "relative overflow-hidden rounded-lg px-4 py-3",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Service Level (target 99.9%)
                </p>
                <span
                  className={cn(
                    "text-2xl font-bold tracking-tight font-mono",
                    serviceLevel >= 99.9
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {serviceLevel}%
                </span>
              </div>
              <div
                className={cn(
                  "rounded-full p-1.5",
                  serviceLevel >= 99.9
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                )}
              >
                <Activity className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-lg px-4 py-3",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Active Orders
                </p>
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                  {displayOrders.length}
                </span>
              </div>
              <div className="rounded-full p-1.5 bg-blue-500/10 text-blue-500">
                <Package className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Financial Health Card (Replaces Fleet Status) */}
          <div
            className={cn(
              "relative overflow-hidden rounded-lg px-4 py-3",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {totalExposure > 0 && mapStatus === "ACTIVE" ? "Total Exposure" : "Pipeline Revenue"}
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-2xl font-bold tracking-tight font-mono",
                      totalExposure > 0 && mapStatus === "ACTIVE"
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-900 dark:text-white"
                    )}
                  >
                    {totalExposure > 0 && mapStatus === "ACTIVE"
                      ? formatCurrency(totalExposure)
                      : formatCurrency(totalPipelineValue)}
                  </span>
                </div>
                {/* Breakdown: Revenue + Product */}
                {totalExposure > 0 && mapStatus === "ACTIVE" && (
                  <div className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                    Rev: {formatCurrency(revenueAtRisk)} + Prod: {formatCurrency(productCostAtRisk)}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "rounded-full p-1.5",
                  totalExposure > 0 && mapStatus === "ACTIVE"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                <DollarSign className="h-4 w-4" />
              </div>
            </div>

            {/* Optional: Tiny progress bar at bottom for context */}
            {totalExposure > 0 && mapStatus === "ACTIVE" && (
               <div className="absolute bottom-0 left-0 h-0.5 w-full bg-red-100 dark:bg-red-900/30">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(revenueAtRisk / totalPipelineValue) * 100}%` }}
                  />
               </div>
            )}
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-lg px-4 py-3",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Network Risk
                </p>
                <span
                  className={cn(
                    "text-2xl font-bold tracking-tight font-mono",
                    mapStatus === "ACTIVE"
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {mapStatus === "ACTIVE" ? "HIGH" : "LOW"}
                </span>
              </div>
              <div
                className={cn(
                  "rounded-full p-1.5",
                  mapStatus === "ACTIVE"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Split: Map + Orders - Using GSAP ExpandableGrid */}
        <ExpandableGrid ref={expandableGridRef} isExpanded={isTableExpanded} columns={4} gap={16} className="flex-1 min-h-0">
            {/* MAP CONTAINER - GPU-accelerated with GSAP Flip animation */}
            <ExpandableGridItem
              collapsedSpan={3}
              expandedSpan={2}
              className="rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-zinc-900/50 shadow-xl relative"
            >
              <div className="absolute inset-0 w-full h-full">
                <FleetMap
                  orders={displayOrders}
                  warehouses={warehouses}
                  incidents={incidents}
                  incidentStatus={mapStatus}
                  incidentDescription={incident?.description}
                  onIncidentClick={() => setShowWarRoom(true)}
                  onHistoricalIncidentClick={async (orderId) => {
                    // Find the resolved/failed incident for this order
                    const incidentForOrder = incidents.find(
                      (inc) => inc.orderId === orderId && inc.status !== "ACTIVE"
                    );
                    if (!incidentForOrder) return;

                    // Fetch full incident data and open historical War Room
                    setLoadingHistoricalIncident(true);
                    try {
                      const res = await fetch(`/api/incidents/${incidentForOrder.id}`);
                      if (!res.ok) throw new Error("Failed to fetch incident");

                      const fullIncident = await res.json();
                      const order = displayOrders.find(o => o.id === orderId) || null;
                      setHistoricalIncident(fullIncident);
                      setHistoricalOrder(order);
                      setShowHistoricalWarRoom(true);
                    } catch (error) {
                      console.error("Error fetching historical incident:", error);
                    } finally {
                      setLoadingHistoricalIncident(false);
                    }
                  }}
                  affectedOrderId={simulation.orderId}
                  highlightedOrderId={highlightedOrderId}
                  onOrderSelect={handleMapOrderSelect}
                />
              </div>
            </ExpandableGridItem>

            {/* TABLE CONTAINER - GPU-accelerated with GSAP Flip animation */}
            <ExpandableGridItem
              collapsedSpan={1}
              expandedSpan={2}
              onMouseEnter={handleTableMouseEnter}
              onMouseLeave={handleTableMouseLeave}
              className="flex flex-col rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-[var(--sysco-card)] shadow-xl z-10"
            >
              {/* Table Toolbar */}
              <div className="flex-none px-4 py-3 border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Live Orders
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Image
                        src={getManhattanLogo()}
                        alt="Manhattan TMS"
                        width={12}
                        height={12}
                        className="object-contain"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">
                        MANHATTAN TMS
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE</span>
                    </div>
                  </div>
                </div>

                {/* Expanded filters - Using GSAP CollapsibleSection */}
                <CollapsibleSection isOpen={isTableExpanded} openMarginTop={12}>
                  <div className="flex gap-2">
                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-[var(--sysco-card)] border border-[var(--sysco-border)] rounded-md focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 transition-colors"
                      />
                    </div>
                    {/* Origin Filter */}
                    <FilterDropdown
                      value={originFilter}
                      onChange={setOriginFilter}
                      options={uniqueOrigins}
                      placeholder="All Origins"
                    />
                    {/* Destination Filter */}
                    <FilterDropdown
                      value={destinationFilter}
                      onChange={setDestinationFilter}
                      options={uniqueDestinations}
                      placeholder="All Destinations"
                    />
                    {/* Price Range Filter */}
                    <PriceRangeSlider
                      min={priceStats.min}
                      max={priceStats.max}
                      minValue={currentPriceMin}
                      maxValue={currentPriceMax}
                      onChange={(min, max) => setPriceRange({ min, max })}
                    />
                  </div>
                </CollapsibleSection>
              </div>

              {/* Table Content - Flex-based div table for better GPU animation */}
              {displayOrders.length === 0 ? (
                <div className="px-4 py-12 text-center flex-1 flex flex-col items-center justify-center">
                  <Package className="h-10 w-10 text-zinc-400 dark:text-zinc-700 mb-2" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">No orders</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-0.5">
                    Click &quot;Simulate Incident&quot;
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  {/* Flex-based Header Row */}
                  <div className="flex items-center border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] sticky top-0 z-10 text-[9px] font-medium uppercase text-zinc-500 tracking-wider">
                    <div className="w-8 py-2 text-center shrink-0" />
                    <div className="w-[130px] px-3 py-2 shrink-0">Route</div>

                    {/* Resizable Payload - Using GSAP AnimatedColumn */}
                    <AnimatedColumn show={true} width={isTableExpanded ? 180 : 130} className="px-3 py-2">
                      Payload
                    </AnimatedColumn>

                    {/* Collapsible Headers - Using GSAP AnimatedColumn */}
                    <AnimatedColumn show={isTableExpanded} width={130} staggerDelay={0} className="px-3 py-2">
                      Carrier
                    </AnimatedColumn>
                    <AnimatedColumn show={isTableExpanded} width={100} staggerDelay={0.05} className="px-3 py-2">
                      Status
                    </AnimatedColumn>
                    <AnimatedColumn show={isTableExpanded} width={100} staggerDelay={0.1} className="px-3 py-2 text-right">
                      Value
                    </AnimatedColumn>
                  </div>

                  {/* Data Rows - Animated with GSAP */}
                  <div ref={tableRowsRef} className="divide-y divide-[var(--sysco-border)]/50">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        data-row-id={order.id}
                        onClick={() => handleOrderClick(order)}
                        className={cn(
                          "flex items-center text-xs font-mono group cursor-pointer transition-colors",
                          highlightedOrderId === order.id
                            ? "bg-blue-500/10 hover:bg-blue-500/15"
                            : "hover:bg-[var(--sysco-surface)]"
                        )}
                      >
                        {/* Status Dot */}
                        <div className="w-8 py-2 flex justify-center shrink-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300",
                            order.riskScore >= 80 ? "bg-red-500 animate-pulse scale-110" :
                            order.riskScore >= 40 ? "bg-orange-500" : "bg-emerald-500"
                          )} />
                        </div>

                        {/* Route */}
                        <div className="w-[130px] px-3 py-2 truncate text-zinc-500 dark:text-zinc-400 shrink-0">
                          <span className="text-zinc-700 dark:text-zinc-300">{order.origin.split(',')[0]}</span>
                          <span className="text-zinc-400 dark:text-zinc-600 mx-1">→</span>
                          <span className="text-zinc-700 dark:text-zinc-300">{order.destination.split(',')[0]}</span>
                        </div>

                        {/* Payload - Resizable with GSAP */}
                        <AnimatedColumn show={true} width={isTableExpanded ? 180 : 130} className="px-3 py-2 truncate text-zinc-600 dark:text-zinc-400">
                          {order.itemName}
                        </AnimatedColumn>

                        {/* Collapsible Cells - Using GSAP AnimatedColumn */}
                        <AnimatedColumn show={isTableExpanded} width={130} staggerDelay={0} className="px-3 py-2 truncate text-zinc-500">
                          {order.carrier}
                        </AnimatedColumn>
                        <AnimatedColumn show={isTableExpanded} width={100} staggerDelay={0.05} className="px-3 py-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-medium border inline-block",
                            getStatusConfig(order.status).bg,
                            getStatusConfig(order.status).text,
                            getStatusConfig(order.status).border
                          )}>
                            {getStatusConfig(order.status).label}
                          </span>
                        </AnimatedColumn>
                        <AnimatedColumn show={isTableExpanded} width={100} staggerDelay={0.1} className="px-3 py-2 text-right text-zinc-400">
                          ${(order.sellPrice || order.orderValue || 0).toLocaleString()}
                        </AnimatedColumn>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ExpandableGridItem>
        </ExpandableGrid>
      </div>

      {/* War Room Modal - Live incident */}
      {showWarRoom && incident && (
        <WarRoomModal
          incident={incident}
          affectedOrder={affectedOrder}
          onClose={() => setShowWarRoom(false)}
        />
      )}

      {/* Historical War Room Modal - For viewing resolved incidents from order clicks */}
      {showHistoricalWarRoom && historicalIncident && (
        <WarRoomModal
          incident={historicalIncident}
          affectedOrder={historicalOrder}
          onClose={handleCloseHistoricalWarRoom}
          mode="historical"
        />
      )}

    </div>
  );
}