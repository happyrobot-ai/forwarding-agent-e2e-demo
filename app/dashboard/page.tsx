"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePusher } from "@/components/PusherProvider";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  AlertCircle,
  TrendingUp,
  Package,
  Truck,
  ArrowRight,
  Activity,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { WarRoomModal } from "@/components/WarRoomModal";
import { IncidentSelectionModal } from "@/components/IncidentSelectionModal";
import { FilterDropdown } from "@/components/FilterDropdown";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";

// Spring config for natural motion - slower and smoother
const SPRING_CONFIG = { type: "spring", stiffness: 100, damping: 20 } as const;

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

// --- TYPES ---
interface Truck {
  id: string;
  driverName: string;
  vehicleType: string;
  status: string;
}

interface Buyer {
  id: string;
  name: string;
  segment: string;
  trustScore: number;
  totalSpend: number;
}

interface Order {
  id: string;
  itemName: string;
  description?: string | null;
  orderValue?: number;
  status: string;
  carrier: string;
  truckId?: string | null;
  truck?: Truck | null;
  origin: string;
  destination: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  riskScore: number;
  routeGeoJson?: number[][] | null;
  progress?: number;
  costPrice?: number;
  sellPrice?: number;
  internalBaseCost?: number;
  actualLogisticsCost?: number;
  buyers?: Buyer[];
  createdAt: string;
  updatedAt: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { pusher } = usePusher();
  const { theme } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [serviceLevel, setServiceLevel] = useState(98);
  const [showWarRoom, setShowWarRoom] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [affectedOrderId, setAffectedOrderId] = useState<string | null>(null);
  const [affectedOrder, setAffectedOrder] = useState<Order | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Table interaction state
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const tableHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate price range from orders
  const priceStats = orders.length > 0 ? {
    min: Math.floor(Math.min(...orders.map(o => o.sellPrice || o.orderValue || 0)) / 1000) * 1000,
    max: Math.ceil(Math.max(...orders.map(o => o.sellPrice || o.orderValue || 0)) / 1000) * 1000,
  } : { min: 0, max: 100000 };

  const currentPriceMin = priceRange?.min ?? priceStats.min;
  const currentPriceMax = priceRange?.max ?? priceStats.max;

  const mapStatus: "IDLE" | "ACTIVE" | "RESOLVED" = incident?.status === "ACTIVE" ? "ACTIVE" : "IDLE";

  const getManhattanLogo = () => {
    return theme === "dark"
      ? "/manhattan/manhattan_tms_white.png"
      : "/manhattan/mahnattan_tms_black.svg";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, incidentsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/incidents"),
        ]);

        const ordersData = await ordersRes.json();
        const incidentsData = await incidentsRes.json();

        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
          const totalOrders = ordersData.length;
          const failedOrders = ordersData.filter(
            (o: Order) => o.status === "CANCELLED"
          ).length;
          const level =
            totalOrders > 0
              ? ((totalOrders - failedOrders) / totalOrders) * 100
              : 98;
          setServiceLevel(Math.round(level));
        }

        if (Array.isArray(incidentsData)) {
          const activeIncident = incidentsData.find(
            (inc: Incident) => inc.status === "ACTIVE"
          );
          setIncident(activeIncident || null);
          if (activeIncident) {
            setShowBanner(true);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    channel.bind("demo-started", (data: { incident: Incident; affectedOrder?: Order }) => {
      setIncident(data.incident);
      setServiceLevel(92);
      if (data.affectedOrder) {
        setAffectedOrder(data.affectedOrder);
      }
      setTimeout(() => setShowBanner(true), 1000);
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setOrders(data));
    });

    channel.bind("agent-update", () => {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setOrders(data));
    });

    channel.bind("demo-complete", () => {
      setIncident(null);
      setShowBanner(false);
      setServiceLevel(98);
      setAffectedOrder(null);
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setOrders(data));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher]);

  const handleTriggerDemo = () => {
    setShowIncidentModal(true);
  };

  const animateRiskScore = useCallback((orderId: string) => {
    const ANIMATION_DURATION = 3000;
    const STEPS = 30;
    const INTERVAL = ANIMATION_DURATION / STEPS;
    let step = 0;

    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    animationRef.current = setInterval(() => {
      step++;
      const progress = step / STEPS;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id === orderId) {
            const startScore = order.riskScore < 80 ? order.riskScore : 0;
            const newScore = Math.round(startScore + (100 - startScore) * easeOut);
            return { ...order, riskScore: Math.min(100, newScore) };
          }
          return order;
        })
      );

      if (step >= STEPS) {
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      }
    }, INTERVAL);
  }, []);

  const handleSelectOrder = async (orderId: string) => {
    setShowIncidentModal(false);
    setIsTriggering(true);
    setAffectedOrderId(orderId);

    const selectedOrder = orders.find(o => o.id === orderId);
    if (selectedOrder) {
      setAffectedOrder(selectedOrder);
    }

    try {
      animateRiskScore(orderId);

      await fetch("/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
    } catch (error) {
      console.error("Error triggering demo:", error);
    } finally {
      setIsTriggering(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  const handleResetDemo = async () => {
    try {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }

      setAffectedOrderId(null);
      setAffectedOrder(null);
      setShowBanner(false);
      setIncident(null);

      await fetch("/api/demo/reset", { method: "POST" });

      const ordersRes = await fetch("/api/orders");
      const ordersData = await ordersRes.json();
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        setServiceLevel(98);
      }
    } catch (error) {
      console.error("Error resetting demo:", error);
    }
  };

  const statusConfig: Record<
    string,
    { bg: string; text: string; dot: string; border: string }
  > = {
    CONFIRMED: {
      bg: "bg-[var(--status-success-bg)]",
      text: "text-[var(--status-success-text)]",
      dot: "bg-emerald-500",
      border: "border-[var(--status-success-border)]",
    },
    IN_TRANSIT: {
      bg: "bg-[var(--status-info-bg)]",
      text: "text-[var(--status-info-text)]",
      dot: "bg-blue-500",
      border: "border-[var(--status-info-border)]",
    },
    CANCELLED: {
      bg: "bg-[var(--status-error-bg)]",
      text: "text-[var(--status-error-text)]",
      dot: "bg-red-500",
      border: "border-[var(--status-error-border)]",
    },
    RECOVERING: {
      bg: "bg-[var(--status-warn-bg)]",
      text: "text-[var(--status-warn-text)]",
      dot: "bg-amber-500 animate-pulse",
      border: "border-[var(--status-warn-border)]",
    },
  };

  const getStatusConfig = (status: string) =>
    statusConfig[status] || {
      bg: "bg-zinc-500/10",
      text: "text-zinc-600 dark:text-zinc-400",
      dot: "bg-zinc-500",
      border: "border-zinc-500/30",
    };

  const uniqueOrigins = [...new Set(orders.map(o => o.origin.split(',')[0]))].sort();
  const uniqueDestinations = [...new Set(orders.map(o => o.destination.split(',')[0]))].sort();

  const filteredOrders = orders.filter(order => {
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

  const resetFilters = () => {
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
    setIsTableExpanded(true);
  };

  const handleTableMouseLeave = () => {
    if (tableHoverTimeoutRef.current) {
      clearTimeout(tableHoverTimeoutRef.current);
    }
    tableHoverTimeoutRef.current = setTimeout(() => {
      setIsTableExpanded(false);
    }, 200);
  };

  const handleOrderClick = (orderId: string) => {
    setHighlightedOrderId(prev => prev === orderId ? null : orderId);
  };

  const handleMapOrderSelect = (orderId: string | null) => {
    setHighlightedOrderId(orderId);
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemo}
              className={cn(
                "px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                "bg-zinc-600 hover:bg-zinc-700 text-white",
                "shadow-lg shadow-zinc-500/20 hover:shadow-zinc-500/30",
                "flex items-center gap-2 border border-zinc-500"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleTriggerDemo}
              className={cn(
                "px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                "bg-red-600 hover:bg-red-700 text-white",
                "shadow-lg shadow-red-500/20 hover:shadow-red-500/30",
                "flex items-center gap-2 border border-red-500"
              )}
            >
              <AlertCircle className="h-4 w-4" />
              Simulate Incident
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4 overflow-hidden">
        {/* Critical Incident Banner - Using Framer Motion */}
        <AnimatePresence>
          {showBanner && incident && (
            <motion.div
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
                  <button className="group flex items-center gap-2 rounded-lg border border-[var(--status-error-border)] bg-red-500/10 dark:bg-red-900/50 px-4 py-2 text-xs font-medium text-[var(--status-error-text)] hover:bg-red-500/20 dark:hover:bg-red-900 transition-colors">
                    Launch Recovery Protocols
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
                  Service Level
                </p>
                <span
                  className={cn(
                    "text-2xl font-bold tracking-tight font-mono",
                    serviceLevel >= 95
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
                  serviceLevel >= 95
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
                  {orders.length}
                </span>
              </div>
              <div className="rounded-full p-1.5 bg-blue-500/10 text-blue-500">
                <Package className="h-4 w-4" />
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
                  Fleet Status
                </p>
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                  {orders.filter((o) => o.status === "IN_TRANSIT").length}
                </span>
              </div>
              <div className="rounded-full p-1.5 bg-violet-500/10 text-violet-500">
                <Truck className="h-4 w-4" />
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
                  Network Risk
                </p>
                <span
                  className={cn(
                    "text-2xl font-bold tracking-tight font-mono",
                    incident
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {incident ? "HIGH" : "LOW"}
                </span>
              </div>
              <div
                className={cn(
                  "rounded-full p-1.5",
                  incident
                    ? "bg-red-500/10 text-red-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Split: Map + Orders - Using Framer Motion LayoutGroup */}
        <LayoutGroup>
          <div className="flex-1 grid grid-cols-4 gap-4 min-h-0 relative">

            {/* MAP CONTAINER - GPU-accelerated with layout animation */}
            <motion.div
              layout
              transition={SPRING_CONFIG}
              className={cn(
                "min-w-0 min-h-0 rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-zinc-900/50 shadow-xl relative",
                isTableExpanded ? "col-span-2" : "col-span-3"
              )}
            >
              <div className="absolute inset-0 w-full h-full">
                <FleetMap
                  orders={orders}
                  incidentStatus={mapStatus}
                  onIncidentClick={() => setShowWarRoom(true)}
                  affectedOrderId={affectedOrderId}
                  highlightedOrderId={highlightedOrderId}
                  onOrderSelect={handleMapOrderSelect}
                />
              </div>
            </motion.div>

            {/* TABLE CONTAINER - GPU-accelerated with layout animation */}
            <motion.div
              layout
              transition={SPRING_CONFIG}
              onMouseEnter={handleTableMouseEnter}
              onMouseLeave={handleTableMouseLeave}
              className={cn(
                "flex flex-col rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-[var(--sysco-card)] shadow-xl z-10",
                isTableExpanded ? "col-span-2" : "col-span-1"
              )}
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

                {/* Expanded filters - Using Framer Motion */}
                <motion.div
                  initial={false}
                  animate={{
                    height: isTableExpanded ? "auto" : 0,
                    opacity: isTableExpanded ? 1 : 0,
                    marginTop: isTableExpanded ? 12 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
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
                </motion.div>
              </div>

              {/* Table Content - Flex-based div table for better GPU animation */}
              {orders.length === 0 ? (
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

                    {/* Resizable Payload - Framer Motion animated width */}
                    <motion.div
                      layout
                      transition={SPRING_CONFIG}
                      className="px-3 py-2 overflow-hidden whitespace-nowrap shrink-0"
                      animate={{ width: isTableExpanded ? 180 : 130 }}
                    >
                      Payload
                    </motion.div>

                    {/* Collapsible Headers */}
                    <AnimatePresence mode="popLayout">
                      {isTableExpanded && (
                        <>
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 130 }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={SPRING_CONFIG}
                            className="px-3 py-2 overflow-hidden whitespace-nowrap shrink-0"
                          >
                            Carrier
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 100 }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={SPRING_CONFIG}
                            className="px-3 py-2 overflow-hidden whitespace-nowrap shrink-0"
                          >
                            Status
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 100 }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={SPRING_CONFIG}
                            className="px-3 py-2 text-right overflow-hidden whitespace-nowrap shrink-0"
                          >
                            Value
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Data Rows */}
                  <div className="divide-y divide-[var(--sysco-border)]/50">
                    {filteredOrders.map((order) => (
                      <motion.div
                        layout
                        key={order.id}
                        onClick={() => handleOrderClick(order.id)}
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

                        {/* Payload - Resizable */}
                        <motion.div
                          layout
                          transition={SPRING_CONFIG}
                          className="px-3 py-2 truncate text-zinc-600 dark:text-zinc-400 shrink-0"
                          animate={{ width: isTableExpanded ? 180 : 130 }}
                        >
                          {order.itemName}
                        </motion.div>

                        {/* Collapsible Cells */}
                        <AnimatePresence mode="popLayout">
                          {isTableExpanded && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 130 }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={SPRING_CONFIG}
                                className="px-3 py-2 truncate text-zinc-500 overflow-hidden shrink-0"
                              >
                                {order.carrier}
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 100 }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={SPRING_CONFIG}
                                className="px-3 py-2 overflow-hidden shrink-0"
                              >
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-medium border inline-block",
                                  getStatusConfig(order.status).bg,
                                  getStatusConfig(order.status).text,
                                  getStatusConfig(order.status).border
                                )}>
                                  {order.status.replace('_', ' ')}
                                </span>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 100 }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={SPRING_CONFIG}
                                className="px-3 py-2 text-right text-zinc-400 overflow-hidden shrink-0"
                              >
                                ${(order.sellPrice || order.orderValue || 0).toLocaleString()}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </LayoutGroup>
      </div>

      {/* War Room Modal */}
      {showWarRoom && incident && (
        <WarRoomModal
          incident={incident}
          affectedOrder={affectedOrder}
          onClose={() => setShowWarRoom(false)}
        />
      )}

      {/* Incident Selection Modal */}
      {showIncidentModal && (
        <IncidentSelectionModal
          orders={orders}
          onClose={() => setShowIncidentModal(false)}
          onSelectOrder={handleSelectOrder}
          isTriggering={isTriggering}
        />
      )}
    </div>
  );
}
