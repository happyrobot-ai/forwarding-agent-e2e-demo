"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { usePusher } from "@/components/PusherProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Search, Package, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterDropdown } from "@/components/FilterDropdown";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { useOrders, revalidateOrders } from "@/hooks";
import type { Order } from "@/hooks";

export default function OrdersPage() {
  const { pusher } = usePusher();
  const { theme } = useTheme();

  // Server State via SWR
  const { orders, isLoading, error } = useOrders();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);

  const getManhattanLogo = () => {
    return theme === "dark"
      ? "/manhattan/manhattan_tms_white.png"
      : "/manhattan/mahnattan_tms_black.svg";
  };

  // Real-time updates via Pusher
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    channel.bind("agent-update", () => {
      revalidateOrders();
    });

    channel.bind("demo-started", () => {
      revalidateOrders();
    });

    channel.bind("demo-complete", () => {
      revalidateOrders();
    });

    // Prisma middleware events
    channel.bind("orders:bulk-updated", () => {
      revalidateOrders();
    });

    channel.bind("orders:bulk-deleted", () => {
      revalidateOrders();
    });

    channel.bind("order:updated", () => {
      revalidateOrders();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher]);

  // Status configuration matching dashboard
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
      label: status.replace("_", " "),
    };

  // Calculate price range from orders
  const priceStats = useMemo(() => {
    if (orders.length === 0) return { min: 0, max: 100000 };
    return {
      min: Math.floor(Math.min(...orders.map((o: Order) => o.sellPrice || o.orderValue || 0)) / 1000) * 1000,
      max: Math.ceil(Math.max(...orders.map((o: Order) => o.sellPrice || o.orderValue || 0)) / 1000) * 1000,
    };
  }, [orders]);

  const currentPriceMin = priceRange?.min ?? priceStats.min;
  const currentPriceMax = priceRange?.max ?? priceStats.max;

  // Derive unique values for filters
  const uniqueOrigins = useMemo(() =>
    [...new Set(orders.map((o: Order) => o.origin?.split(",")[0] || "Unknown"))].sort(),
    [orders]
  );

  const uniqueDestinations = useMemo(() =>
    [...new Set(orders.map((o: Order) => o.destination?.split(",")[0] || "Unknown"))].sort(),
    [orders]
  );

  const uniqueStatuses = useMemo(() =>
    [...new Set(orders.map((o: Order) => o.status))].sort(),
    [orders]
  );

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order: Order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.origin || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.destination || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.carrier.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOrigin = originFilter === "" || (order.origin?.split(",")[0] || "") === originFilter;
      const matchesDestination = destinationFilter === "" || (order.destination?.split(",")[0] || "") === destinationFilter;
      const matchesStatus = statusFilter === "" || order.status === statusFilter;

      const orderPrice = order.sellPrice || order.orderValue || 0;
      const matchesPrice = orderPrice >= currentPriceMin && orderPrice <= currentPriceMax;

      return matchesSearch && matchesOrigin && matchesDestination && matchesStatus && matchesPrice;
    });
  }, [orders, searchQuery, originFilter, destinationFilter, statusFilter, currentPriceMin, currentPriceMax]);

  const resetFilters = () => {
    setSearchQuery("");
    setOriginFilter("");
    setDestinationFilter("");
    setStatusFilter("");
    setPriceRange(null);
  };

  const hasPriceFilter = priceRange !== null && (priceRange.min > priceStats.min || priceRange.max < priceStats.max);
  const hasActiveFilters = searchQuery !== "" || originFilter !== "" || destinationFilter !== "" || statusFilter !== "" || hasPriceFilter;

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sysco-bg)]">
        <div className="text-center">
          <p className="text-red-500 font-mono text-sm mb-2">ERROR LOADING ORDERS</p>
          <button
            onClick={() => revalidateOrders()}
            className="px-4 py-2 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            Retry
          </button>
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
            onClick={() => revalidateOrders()}
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9 pr-3 py-2 text-xs bg-zinc-900/50 border border-zinc-800 rounded-md",
                "focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20",
                "text-zinc-200 placeholder:text-zinc-500 font-mono transition-colors"
              )}
            />
          </div>

          {/* Origin Filter */}
          <FilterDropdown
            value={originFilter}
            onChange={setOriginFilter}
            options={uniqueOrigins}
            placeholder="Origin"
            label="Origin"
          />

          {/* Destination Filter */}
          <FilterDropdown
            value={destinationFilter}
            onChange={setDestinationFilter}
            options={uniqueDestinations}
            placeholder="Destination"
            label="Destination"
          />

          {/* Status Filter */}
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={uniqueStatuses}
            placeholder="Status"
            label="Status"
          />

          {/* Price Range Filter */}
          <PriceRangeSlider
            min={priceStats.min}
            max={priceStats.max}
            minValue={currentPriceMin}
            maxValue={currentPriceMax}
            onChange={(min, max) => setPriceRange({ min, max })}
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-md transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}
        </div>

        {/* Orders Table */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
            "shadow-sm"
          )}
        >
          {/* Table Header */}
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
                <thead className="border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-[10px] font-medium uppercase text-zinc-500 tracking-wider">
                  <tr>
                    <th className="w-10 py-3 text-center"></th>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Payload</th>
                    <th className="px-4 py-3">Carrier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sysco-border)]/50">
                  {filteredOrders.map((order: Order) => {
                    const config = getStatusConfig(order.status);
                    const riskScore = order.riskScore || 0;

                    return (
                      <tr
                        key={order.id}
                        className="group hover:bg-[var(--sysco-surface)] transition-colors"
                      >
                        {/* Risk Indicator */}
                        <td className="py-3 text-center">
                          <div
                            className={cn(
                              "w-2.5 h-2.5 rounded-full mx-auto transition-all duration-300",
                              riskScore >= 80
                                ? "bg-red-500 animate-pulse scale-110"
                                : riskScore >= 40
                                ? "bg-orange-500"
                                : "bg-emerald-500"
                            )}
                          />
                        </td>

                        {/* Order ID */}
                        <td className="px-4 py-3 font-mono text-zinc-400 text-xs">
                          #{order.id}
                        </td>

                        {/* Route */}
                        <td className="px-4 py-3 text-xs">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {(order.origin || "Unknown").split(",")[0]}
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-600 mx-1.5">→</span>
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {(order.destination || "Unknown").split(",")[0]}
                          </span>
                        </td>

                        {/* Payload */}
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                          {order.itemName}
                        </td>

                        {/* Carrier */}
                        <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                          {order.carrier}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border",
                              config.bg,
                              config.text,
                              config.border
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                            {config.label}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="px-4 py-3 text-right text-zinc-400 font-mono text-xs">
                          ${(order.sellPrice || order.orderValue || 0).toLocaleString()}
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
