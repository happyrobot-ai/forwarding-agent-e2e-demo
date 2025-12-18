"use client";

import { useState } from "react";
import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import { Truck, MapPin, Clock, Fuel, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  name: string;
  driver: string;
  status: "active" | "idle" | "maintenance" | "offline";
  location: string;
  fuelLevel: number;
  lastUpdate: string;
  currentRoute?: string;
}

// Mock fleet data for demo
const mockFleet: Vehicle[] = [
  {
    id: "TRK-001",
    name: "Sysco Truck 001",
    driver: "John Smith",
    status: "active",
    location: "Houston, TX",
    fuelLevel: 78,
    lastUpdate: "2 min ago",
    currentRoute: "Houston → Dallas",
  },
  {
    id: "TRK-002",
    name: "Sysco Truck 002",
    driver: "Maria Garcia",
    status: "active",
    location: "San Antonio, TX",
    fuelLevel: 92,
    lastUpdate: "5 min ago",
    currentRoute: "San Antonio → Austin",
  },
  {
    id: "TRK-003",
    name: "Sysco Truck 003",
    driver: "Robert Johnson",
    status: "idle",
    location: "Dallas, TX",
    fuelLevel: 45,
    lastUpdate: "15 min ago",
  },
  {
    id: "TRK-004",
    name: "Sysco Truck 004",
    driver: "Emily Davis",
    status: "maintenance",
    location: "Houston Depot",
    fuelLevel: 30,
    lastUpdate: "1 hour ago",
  },
  {
    id: "TRK-005",
    name: "Sysco Truck 005",
    driver: "Michael Wilson",
    status: "active",
    location: "Fort Worth, TX",
    fuelLevel: 65,
    lastUpdate: "3 min ago",
    currentRoute: "Fort Worth → Waco",
  },
  {
    id: "TRK-006",
    name: "Sysco Truck 006",
    driver: "Sarah Brown",
    status: "offline",
    location: "Unknown",
    fuelLevel: 0,
    lastUpdate: "3 hours ago",
  },
];

export default function FleetPage() {
  const { theme } = useTheme();
  const [fleet] = useState<Vehicle[]>(mockFleet);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getSamsaraLogo = () => {
    return theme === "dark"
      ? "/samsara/Samsara_logo_primary_vertical_wht.png"
      : "/samsara/Samsara_logo_primary_vertical_blk.png";
  };

  const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle; border: string }> = {
    active: {
      bg: "bg-[var(--status-success-bg)]",
      text: "text-[var(--status-success-text)]",
      icon: CheckCircle,
      border: "border-[var(--status-success-border)]",
    },
    idle: {
      bg: "bg-[var(--status-info-bg)]",
      text: "text-[var(--status-info-text)]",
      icon: Clock,
      border: "border-[var(--status-info-border)]",
    },
    maintenance: {
      bg: "bg-[var(--status-warn-bg)]",
      text: "text-[var(--status-warn-text)]",
      icon: AlertTriangle,
      border: "border-[var(--status-warn-border)]",
    },
    offline: {
      bg: "bg-[var(--status-error-bg)]",
      text: "text-[var(--status-error-text)]",
      icon: AlertTriangle,
      border: "border-[var(--status-error-border)]",
    },
  };

  const getStatusConfig = (status: string) =>
    statusConfig[status] || statusConfig.idle;

  const filteredFleet = fleet.filter((vehicle) =>
    statusFilter === "all" ? true : vehicle.status === statusFilter
  );

  const stats = {
    total: fleet.length,
    active: fleet.filter((v) => v.status === "active").length,
    idle: fleet.filter((v) => v.status === "idle").length,
    maintenance: fleet.filter((v) => v.status === "maintenance").length,
    offline: fleet.filter((v) => v.status === "offline").length,
  };

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
              Offline
            </p>
            <p className="text-3xl font-bold text-red-500 mt-1 font-mono">
              {stats.offline}
            </p>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-red-500/10 blur-xl" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {["all", "active", "idle", "maintenance", "offline"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                statusFilter === status
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-[var(--sysco-card)] text-zinc-400 border-[var(--sysco-border)] hover:bg-[var(--sysco-surface)] hover:text-zinc-200"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
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
              {filteredFleet.length} VEHICLES
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-xs font-medium uppercase text-zinc-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Driver</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Route</th>
                  <th className="px-6 py-3">Fuel</th>
                  <th className="px-6 py-3">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sysco-border)]">
                {filteredFleet.map((vehicle) => {
                  const config = getStatusConfig(vehicle.status);
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={vehicle.id}
                      className="group hover:bg-[var(--sysco-surface)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--sysco-surface)] border border-[var(--sysco-border)] flex items-center justify-center">
                            <Truck className="h-5 w-5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-mono text-zinc-700 dark:text-zinc-300">
                              {vehicle.id}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {vehicle.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                        {vehicle.driver}
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
                          {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {vehicle.location}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                        {vehicle.currentRoute || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Fuel className="h-3.5 w-3.5 text-zinc-500" />
                          <div className="w-16 h-2 bg-[var(--sysco-surface)] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                vehicle.fuelLevel > 50
                                  ? "bg-emerald-500"
                                  : vehicle.fuelLevel > 25
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${vehicle.fuelLevel}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 font-mono">
                            {vehicle.fuelLevel}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                        {vehicle.lastUpdate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
