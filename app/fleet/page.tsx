"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import { useTrucks, revalidateTrucks } from "@/hooks";
import { FilterDropdown } from "@/components/FilterDropdown";
import { usePusher } from "@/components/PusherProvider";
import {
  Truck as TruckIcon,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Package,
  RefreshCw,
  Loader2,
  Snowflake,
  Box,
  Layers,
  Droplet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Vehicle type display configuration
const vehicleTypeConfig: Record<string, { label: string; icon: typeof Snowflake; color: string }> = {
  REFRIGERATED: {
    label: "Refrigerated",
    icon: Snowflake,
    color: "text-cyan-500",
  },
  DRY_VAN: {
    label: "Dry Van",
    icon: Box,
    color: "text-amber-500",
  },
  FLATBED: {
    label: "Flatbed",
    icon: Layers,
    color: "text-zinc-500",
  },
  TANKER: {
    label: "Tanker",
    icon: Droplet,
    color: "text-blue-500",
  },
};

// Status display configuration
const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle; border: string; label: string }> = {
  ACTIVE: {
    bg: "bg-[var(--status-success-bg)]",
    text: "text-[var(--status-success-text)]",
    icon: CheckCircle,
    border: "border-[var(--status-success-border)]",
    label: "Active",
  },
  IDLE: {
    bg: "bg-[var(--status-info-bg)]",
    text: "text-[var(--status-info-text)]",
    icon: Clock,
    border: "border-[var(--status-info-border)]",
    label: "Idle",
  },
  MAINTENANCE: {
    bg: "bg-[var(--status-warn-bg)]",
    text: "text-[var(--status-warn-text)]",
    icon: AlertTriangle,
    border: "border-[var(--status-warn-border)]",
    label: "Maintenance",
  },
  INCIDENT: {
    bg: "bg-[var(--status-error-bg)]",
    text: "text-[var(--status-error-text)]",
    icon: AlertTriangle,
    border: "border-[var(--status-error-border)]",
    label: "Incident",
  },
};

export default function FleetPage() {
  const { theme } = useTheme();
  const { trucks, isLoading, isError, error } = useTrucks();
  const { pusher } = usePusher();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("");
  const [driverFilter, setDriverFilter] = useState<string>("");

  // Subscribe to Pusher events for real-time updates
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    // Listen for truck-related events
    channel.bind("truck:updated", () => {
      revalidateTrucks();
    });

    channel.bind("order:updated", () => {
      // Revalidate trucks when orders change (affects currentOrder)
      revalidateTrucks();
    });

    channel.bind("orders:bulk-updated", () => {
      revalidateTrucks();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher]);

  const getSamsaraLogo = () => {
    return theme === "dark"
      ? "/samsara/Samsara_logo_primary_vertical_wht.png"
      : "/samsara/Samsara_logo_primary_vertical_blk.png";
  };

  const getStatusConfig = (status: string) =>
    statusConfig[status] || statusConfig.IDLE;

  const getVehicleTypeConfig = (type: string) =>
    vehicleTypeConfig[type] || vehicleTypeConfig.DRY_VAN;

  // Extract unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(trucks.map((t) => t.status))];
    return statuses.sort();
  }, [trucks]);

  const uniqueVehicleTypes = useMemo(() => {
    const types = [...new Set(trucks.map((t) => t.vehicleType))];
    return types.sort();
  }, [trucks]);

  const uniqueDrivers = useMemo(() => {
    const drivers = [...new Set(trucks.map((t) => t.driverName))];
    return drivers.sort();
  }, [trucks]);

  // Apply filters
  const filteredTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      if (statusFilter && truck.status !== statusFilter) return false;
      // vehicleTypeFilter uses labels, need to match against the label
      if (vehicleTypeFilter && getVehicleTypeConfig(truck.vehicleType).label !== vehicleTypeFilter) return false;
      if (driverFilter && truck.driverName !== driverFilter) return false;
      return true;
    });
  }, [trucks, statusFilter, vehicleTypeFilter, driverFilter]);

  // Calculate stats from real data
  const stats = useMemo(() => ({
    total: trucks.length,
    active: trucks.filter((t) => t.status === "ACTIVE").length,
    idle: trucks.filter((t) => t.status === "IDLE").length,
    maintenance: trucks.filter((t) => t.status === "MAINTENANCE").length,
    incident: trucks.filter((t) => t.status === "INCIDENT").length,
  }), [trucks]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--sysco-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-zinc-500 font-mono text-sm">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-[var(--sysco-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-zinc-400">Failed to load fleet data</p>
          <p className="text-zinc-500 text-sm font-mono">{error?.message}</p>
          <button
            onClick={() => revalidateTrucks()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
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
              Fleet Management
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Image
                src={getSamsaraLogo()}
                alt="Samsara"
                width={14}
                height={14}
                className="object-contain"
              />
              <span className="text-sm text-zinc-500 font-mono">
                SAMSARA INTEGRATION
              </span>
            </div>
          </div>
          <button
            onClick={() => revalidateTrucks()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Total Vehicles
            </p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1 font-mono">
              {stats.total}
            </p>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider">
              Active
            </p>
            <p className="text-3xl font-bold text-emerald-500 mt-1 font-mono">
              {stats.active}
            </p>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <p className="text-xs font-medium text-blue-500 uppercase tracking-wider">
              Idle
            </p>
            <p className="text-3xl font-bold text-blue-500 mt-1 font-mono">
              {stats.idle}
            </p>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-500/10 blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">
              Maintenance
            </p>
            <p className="text-3xl font-bold text-amber-500 mt-1 font-mono">
              {stats.maintenance}
            </p>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <p className="text-xs font-medium text-red-500 uppercase tracking-wider">
              Incident
            </p>
            <p className="text-3xl font-bold text-red-500 mt-1 font-mono">
              {stats.incident}
            </p>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-red-500/10 blur-xl" />
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3">
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={uniqueStatuses}
            placeholder="Status"
            label="Status"
          />
          <FilterDropdown
            value={vehicleTypeFilter}
            onChange={setVehicleTypeFilter}
            options={uniqueVehicleTypes.map((t) => getVehicleTypeConfig(t).label)}
            placeholder="Vehicle Type"
            label="Type"
          />
          <FilterDropdown
            value={driverFilter}
            onChange={setDriverFilter}
            options={uniqueDrivers}
            placeholder="Driver"
            label="Driver"
          />
        </div>

        {/* Fleet Table */}
        <div className={cn(
          "rounded-xl overflow-hidden",
          "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
          "shadow-sm"
        )}>
          <div className="px-6 py-4 border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)]">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              Vehicle Fleet
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {filteredTrucks.length} VEHICLES
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-xs font-medium uppercase text-zinc-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Driver</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Current Route</th>
                  <th className="px-6 py-3">Progress</th>
                  <th className="px-6 py-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sysco-border)]">
                {filteredTrucks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <TruckIcon className="h-8 w-8 text-zinc-600" />
                        <p className="text-zinc-500">No vehicles found</p>
                        <p className="text-zinc-600 text-xs">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrucks.map((truck) => {
                    const config = getStatusConfig(truck.status);
                    const typeConfig = getVehicleTypeConfig(truck.vehicleType);
                    const StatusIcon = config.icon;
                    const TypeIcon = typeConfig.icon;
                    const currentOrder = truck.currentOrder;

                    return (
                      <tr
                        key={truck.id}
                        className="group hover:bg-[var(--sysco-surface)] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--sysco-surface)] border border-[var(--sysco-border)] flex items-center justify-center">
                              <TruckIcon className="h-5 w-5 text-zinc-500" />
                            </div>
                            <div>
                              <p className="font-mono text-zinc-700 dark:text-zinc-300">
                                {truck.id}
                              </p>
                              <p className="text-xs text-zinc-500">
                                Sysco Fleet
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                          {truck.driverName}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
                            <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                              {typeConfig.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                              config.bg,
                              config.text,
                              config.border
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {currentOrder ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                              <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">
                                {currentOrder.origin} → {currentOrder.destination}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {currentOrder ? (
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 text-zinc-500" />
                              <div className="w-16 h-2 bg-[var(--sysco-surface)] rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    currentOrder.riskScore >= 80
                                      ? "bg-red-500"
                                      : currentOrder.riskScore >= 40
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  )}
                                  style={{ width: `${currentOrder.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-500 font-mono">
                                {currentOrder.progress || 0}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                          {new Date(truck.updatedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
