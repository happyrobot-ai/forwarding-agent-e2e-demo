"use client";

import { useEffect, useState } from "react";
import { usePusher } from "@/components/PusherProvider";
import {
  AlertCircle,
  TrendingUp,
  Package,
  Truck,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WarRoomModal } from "@/components/WarRoomModal";

interface Order {
  id: string;
  itemName: string;
  status: string;
  carrier: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [serviceLevel, setServiceLevel] = useState(98);
  const [showWarRoom, setShowWarRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleTriggerDemo = async () => {
    try {
      await fetch("/api/demo/trigger", { method: "POST" });
    } catch (error) {
      console.error("Error triggering demo:", error);
    }
  };

  const statusConfig: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    CONFIRMED: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    IN_TRANSIT: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      dot: "bg-blue-500",
    },
    CANCELLED: {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    },
    RECOVERING: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500 animate-pulse",
    },
  };

  const getStatusConfig = (status: string) =>
    statusConfig[status] || {
      bg: "bg-gray-500/10",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-500",
    };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#F8FAFC]/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.08]">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Command Center
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Real-time supply chain monitoring
            </p>
          </div>
          <button
            onClick={handleTriggerDemo}
            className={cn(
              "px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              "bg-red-500 hover:bg-red-600 text-white",
              "shadow-lg shadow-red-500/25 hover:shadow-red-500/40",
              "flex items-center gap-2"
            )}
          >
            <AlertCircle className="h-4 w-4" />
            Simulate Incident
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Active Incident Alert */}
        {incident && (
          <div
            onClick={() => setShowWarRoom(true)}
            className={cn(
              "relative overflow-hidden rounded-xl p-5 cursor-pointer",
              "bg-gradient-to-r from-red-500 to-rose-600",
              "shadow-xl shadow-red-500/20",
              "transition-all duration-300 hover:shadow-red-500/40 hover:scale-[1.01]"
            )}
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold text-white uppercase tracking-wide">
                    Critical
                  </span>
                  <span className="text-white/70 text-sm">Active Incident</span>
                </div>
                <p className="text-white font-medium mt-1">{incident.title}</p>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <span className="text-sm">View AI Response</span>
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Service Level */}
          <div
            className={cn(
              "rounded-xl p-6",
              "bg-white dark:bg-[#18181B]",
              "border border-gray-200/60 dark:border-white/[0.08]",
              "shadow-sm"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Service Level
                </p>
                <p
                  className={cn(
                    "text-3xl font-bold mt-2 tracking-tight",
                    serviceLevel >= 95
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {serviceLevel}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Target: 95%
                </p>
              </div>
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  serviceLevel >= 95
                    ? "bg-emerald-500/10 dark:bg-emerald-500/20"
                    : "bg-red-500/10 dark:bg-red-500/20"
                )}
              >
                <TrendingUp
                  className={cn(
                    "h-6 w-6",
                    serviceLevel >= 95
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Active Orders */}
          <div
            className={cn(
              "rounded-xl p-6",
              "bg-white dark:bg-[#18181B]",
              "border border-gray-200/60 dark:border-white/[0.08]",
              "shadow-sm"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Orders
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
                  {orders.length}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  In pipeline
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* In Transit */}
          <div
            className={cn(
              "rounded-xl p-6",
              "bg-white dark:bg-[#18181B]",
              "border border-gray-200/60 dark:border-white/[0.08]",
              "shadow-sm"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  In Transit
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
                  {orders.filter((o) => o.status === "IN_TRANSIT").length}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  On the road
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
                <Truck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-white dark:bg-[#18181B]",
            "border border-gray-200/60 dark:border-white/[0.08]",
            "shadow-sm"
          )}
        >
          <div className="px-6 py-4 border-b border-gray-200/60 dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Orders
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manhattan TMS Integration
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Live updates</span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Click &quot;Simulate Incident&quot; to create test data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Carrier
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  {orders.map((order) => {
                    const config = getStatusConfig(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            #{order.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {order.itemName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                              config.bg,
                              config.text
                            )}
                          >
                            <span
                              className={cn("w-1.5 h-1.5 rounded-full", config.dot)}
                            />
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {order.carrier}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
    </div>
  );
}
