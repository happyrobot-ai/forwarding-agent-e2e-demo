"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePusher } from "@/components/PusherProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Search, Filter, RefreshCw, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  itemName: string;
  status: string;
  carrier: string;
  createdAt: string;
  updatedAt: string;
}

export default function OrdersPage() {
  const { pusher } = usePusher();
  const { theme } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getManhattanLogo = () => {
    return theme === "dark"
      ? "/manhattan/manhattan_tms_white.png"
      : "/manhattan/mahnattan_tms_black.svg";
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    channel.bind("agent-update", () => {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setOrders(data));
    });

    channel.bind("demo-started", () => {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setOrders(data));
    });

    channel.bind("demo-complete", () => {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setOrders(data));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (error) {
      console.error("Error refreshing orders:", error);
    }
    setIsLoading(false);
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string; border: string }> = {
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.carrier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = Array.from(new Set(orders.map((o) => o.status)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sysco-bg)]">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">LOADING ORDERS...</span>
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
              Orders
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Image
                src={getManhattanLogo()}
                alt="Manhattan TMS"
                width={14}
                height={14}
                className="object-contain"
              />
              <span className="text-sm text-zinc-500 font-mono">
                MANHATTAN TMS INTEGRATION
              </span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
              "bg-[var(--sysco-surface)] hover:bg-zinc-200 dark:hover:bg-zinc-800",
              "text-zinc-700 dark:text-zinc-300",
              "border border-[var(--sysco-border)]",
              "flex items-center gap-2"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-lg text-sm",
                "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
                "text-zinc-900 dark:text-white placeholder-zinc-500",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                "pl-10 pr-8 py-2.5 rounded-lg text-sm appearance-none",
                "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
                "text-zinc-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
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
                All Orders
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                {filteredOrders.length} OF {orders.length} RECORDS
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--sysco-surface)] flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-zinc-500" />
              </div>
              <p className="text-zinc-400 font-medium">No orders found</p>
              <p className="text-sm text-zinc-600 mt-1">
                {orders.length === 0
                  ? "Trigger a demo to create test orders"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-xs font-medium uppercase text-zinc-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Payload</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Carrier</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sysco-border)]">
                  {filteredOrders.map((order) => {
                    const config = getStatusConfig(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="group hover:bg-[var(--sysco-surface)] transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-zinc-700 dark:text-zinc-300">
                          #{order.id}
                        </td>
                        <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100">
                          {order.itemName}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
                              config.bg,
                              config.text,
                              config.border
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                          {order.carrier}
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                          {new Date(order.updatedAt).toLocaleDateString()}
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
    </div>
  );
}
