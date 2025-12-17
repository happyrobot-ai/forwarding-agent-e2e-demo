"use client";

import { useEffect, useState } from "react";
import { usePusher } from "@/components/PusherProvider";
import { AlertCircle, TrendingUp, Package, CheckCircle2 } from "lucide-react";
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, incidentsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/incidents"),
        ]);

        const ordersData = await ordersRes.json();
        const incidentsData = await incidentsRes.json();

        // Handle API errors
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);

          // Calculate service level based on order status
          const totalOrders = ordersData.length;
          const failedOrders = ordersData.filter(
            (o: Order) => o.status === "CANCELLED"
          ).length;
          const level = totalOrders > 0 ? ((totalOrders - failedOrders) / totalOrders) * 100 : 98;
          setServiceLevel(Math.round(level));
        }

        // Find active incident
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

  // Listen for Pusher events
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    channel.bind("demo-started", (data: { incident: Incident }) => {
      setIncident(data.incident);
      setServiceLevel(92);
      // Refresh orders
      fetch("/api/orders").then(res => res.json()).then(setOrders);
    });

    channel.bind("agent-update", () => {
      // Refresh orders to show status changes
      fetch("/api/orders").then(res => res.json()).then(setOrders);
    });

    channel.bind("demo-complete", () => {
      setIncident(null);
      setServiceLevel(98);
      // Refresh orders
      fetch("/api/orders").then(res => res.json()).then(setOrders);
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

  const statusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400";
      case "IN_TRANSIT":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400";
      case "CANCELLED":
        return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
      case "RECOVERING":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Supply Chain Command Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time monitoring and AI orchestration
          </p>
        </div>
        <button
          onClick={handleTriggerDemo}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Simulate Incident
        </button>
      </div>

      {/* Active Incident Alert */}
      {incident && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border-2 border-red-600 rounded-xl p-4 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          onClick={() => setShowWarRoom(true)}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                CRITICAL ALERT
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                {incident.title}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Click to view AI Agent response
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Service Level
              </p>
              <p
                className={cn(
                  "text-3xl font-bold mt-2",
                  serviceLevel >= 95
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {serviceLevel}%
              </p>
            </div>
            <TrendingUp
              className={cn(
                "h-12 w-12",
                serviceLevel >= 95
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Orders
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {orders.length}
              </p>
            </div>
            <Package className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Deliveries Today
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {orders.filter((o) => o.status === "IN_TRANSIT").length}
              </p>
            </div>
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Orders - Manhattan TMS
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order ID
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
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {order.itemName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        statusColor(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {order.carrier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* War Room Modal */}
      {showWarRoom && incident && (
        <WarRoomModal
          incident={incident}
          onClose={() => setShowWarRoom(false)}
        />
      )}
    </div>
  );
}
