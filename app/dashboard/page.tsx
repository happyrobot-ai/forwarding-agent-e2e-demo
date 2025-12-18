"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePusher } from "@/components/PusherProvider";
import { useTheme } from "@/components/ThemeProvider";
import {
  AlertCircle,
  TrendingUp,
  Package,
  Truck,
  ArrowRight,
  Clock,
  Activity,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WarRoomModal } from "@/components/WarRoomModal";
import { IncidentSelectionModal } from "@/components/IncidentSelectionModal";

// Dynamic import for FleetMap to avoid SSR issues with Mapbox
const FleetMap = dynamic(
  () => import("@/components/FleetMap").then((mod) => mod.FleetMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] w-full rounded-xl border border-[var(--sysco-border)] bg-[var(--sysco-card)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">LOADING MAP...</span>
        </div>
      </div>
    ),
  }
);

interface Truck {
  id: string;
  driverName: string;
  vehicleType: string;
  status: string;
}

interface Order {
  id: string;
  itemName: string;
  description?: string | null;
  orderValue?: number;
  status: string;
  carrier: string;
  truckId?: string | null;
  truck?: Truck | null; // Samsara truck info
  origin: string;
  destination: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  riskScore: number;
  routeGeoJson?: number[][] | null; // Precomputed Mapbox route
  progress?: number; // 0-100, truck position along route
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
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Map status for FleetMap component
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

    channel.bind("demo-started", (data: { incident: Incident }) => {
      setIncident(data.incident);
      setServiceLevel(92);
      // Delay showing banner until after map zoom starts (1 second)
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

  // Gradient animation: smoothly escalate riskScore from current to 100
  const animateRiskScore = useCallback((orderId: string) => {
    const ANIMATION_DURATION = 3000; // 3 seconds
    const STEPS = 30;
    const INTERVAL = ANIMATION_DURATION / STEPS;
    let step = 0;

    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    animationRef.current = setInterval(() => {
      step++;
      const progress = step / STEPS;
      // Ease-out curve for smoother animation
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
    setIsTriggering(true);
    setAffectedOrderId(orderId);

    try {
      // Start the gradient animation immediately
      animateRiskScore(orderId);

      // Trigger the API
      await fetch("/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      setShowIncidentModal(false);
    } catch (error) {
      console.error("Error triggering demo:", error);
    } finally {
      setIsTriggering(false);
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  const handleResetDemo = async () => {
    try {
      // Clear animation if running
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }

      // Reset local state
      setAffectedOrderId(null);
      setShowBanner(false);
      setIncident(null);

      // Call reset API
      await fetch("/api/demo/reset", { method: "POST" });

      // Refresh orders
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
    <div className="min-h-screen bg-[var(--sysco-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--sysco-bg)]/80 backdrop-blur-xl border-b border-[var(--sysco-border)]">
        <div className="px-8 py-5 flex items-center justify-between">
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

      <div className="p-8 space-y-6">
        {/* Critical Incident Banner - Animated slide down */}
        <div
          className={cn(
            "transition-all duration-500 ease-out overflow-hidden",
            showBanner && incident ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {incident && (
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
                  {/* Pulsing indicator */}
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
              {/* Progress bar */}
              <div className="h-1 w-full bg-red-200 dark:bg-red-900/50">
                <div className="h-full w-1/3 animate-pulse bg-red-500/70" />
              </div>
            </div>
          )}
        </div>

        {/* Hero Fleet Map */}
        <FleetMap
          orders={orders}
          incidentStatus={mapStatus}
          onIncidentClick={() => setShowWarRoom(true)}
          affectedOrderId={affectedOrderId}
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Service Level */}
          <div
            className={cn(
              "relative overflow-hidden rounded-xl p-6",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Service Level
              </h3>
              <div
                className={cn(
                  "rounded-full p-2",
                  serviceLevel >= 95
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                )}
              >
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span
                className={cn(
                  "text-4xl font-bold tracking-tight font-mono",
                  serviceLevel >= 95
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {serviceLevel}%
              </span>
              <p className="mt-1 text-xs text-zinc-500">Target: 95% SLA</p>
            </div>
            {/* Decorative glow */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />
          </div>

          {/* Active Orders */}
          <div
            className={cn(
              "relative overflow-hidden rounded-xl p-6",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Active Orders
              </h3>
              <div className="rounded-full p-2 bg-blue-500/10 text-blue-500">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                {orders.length}
              </span>
              <p className="mt-1 text-xs text-zinc-500">In pipeline</p>
            </div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />
          </div>

          {/* In Transit */}
          <div
            className={cn(
              "relative overflow-hidden rounded-xl p-6",
              "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
              "shadow-sm transition-all hover:border-zinc-600 dark:hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                In Transit
              </h3>
              <div className="rounded-full p-2 bg-violet-500/10 text-violet-500">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                {orders.filter((o) => o.status === "IN_TRANSIT").length}
              </span>
              <p className="mt-1 text-xs text-zinc-500">On the road</p>
            </div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />
          </div>
        </div>

        {/* Orders Table */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
            "shadow-sm"
          )}
        >
          <div className="px-6 py-4 border-b border-[var(--sysco-border)] flex items-center justify-between bg-[var(--sysco-surface)]">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                Live Orders
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Image
                  src={getManhattanLogo()}
                  alt="Manhattan TMS"
                  width={14}
                  height={14}
                  className="object-contain"
                />
                <span className="text-xs text-zinc-500 font-mono">
                  MANHATTAN TMS INTEGRATION
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Package className="h-12 w-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-600 dark:text-zinc-400 font-medium">No orders in system</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-600 mt-1">
                Click &quot;Simulate Incident&quot; to create test data
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-[10px] font-medium uppercase text-zinc-500 tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Load ID</th>
                    <th className="px-4 py-2.5">Route</th>
                    <th className="px-4 py-2.5">Payload</th>
                    <th className="px-4 py-2.5">Carrier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sysco-border)]/50 font-mono">
                  {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="group hover:bg-[var(--sysco-surface)] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            order.riskScore >= 80 ? "bg-red-500 animate-pulse" :
                            order.riskScore >= 40 ? "bg-orange-500" : "bg-emerald-500"
                          )} />
                        </td>
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">
                          {order.id}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                          {order.origin} <span className="text-zinc-400 dark:text-zinc-600">→</span> {order.destination}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">
                          {order.itemName}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                          {order.carrier}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* War Room Modal */}
      {showWarRoom && incident && (
        <WarRoomModal incident={incident} onClose={() => setShowWarRoom(false)} />
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
