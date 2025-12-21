"use client";

import { cn } from "@/lib/utils";

/**
 * Base skeleton component with shimmer animation.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
}

/**
 * KPI Card skeleton for the dashboard header.
 */
export function KPICardSkeleton() {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg px-4 py-3",
        "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
        "shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Order table row skeleton.
 */
export function TableRowSkeleton({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className="flex items-center text-xs font-mono border-b border-[var(--sysco-border)]/50 py-2">
      {/* Status dot */}
      <div className="w-8 flex justify-center">
        <Skeleton className="w-2 h-2 rounded-full" />
      </div>
      {/* Route */}
      <div className="w-[130px] px-3">
        <Skeleton className="h-4 w-full" />
      </div>
      {/* Payload */}
      <div className={expanded ? "w-[180px] px-3" : "w-[130px] px-3"}>
        <Skeleton className="h-4 w-full" />
      </div>
      {expanded && (
        <>
          {/* Carrier */}
          <div className="w-[130px] px-3">
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Status */}
          <div className="w-[100px] px-3">
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          {/* Value */}
          <div className="w-[100px] px-3 flex justify-end">
            <Skeleton className="h-4 w-14" />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Full table skeleton with multiple rows.
 */
export function TableSkeleton({
  rows = 8,
  expanded = false,
}: {
  rows?: number;
  expanded?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-[var(--sysco-card)] shadow-xl">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)]">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
      {/* Table header */}
      <div className="flex items-center border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-[9px]">
        <div className="w-8 py-2" />
        <div className="w-[130px] px-3 py-2">
          <Skeleton className="h-2 w-12" />
        </div>
        <div className={expanded ? "w-[180px] px-3 py-2" : "w-[130px] px-3 py-2"}>
          <Skeleton className="h-2 w-14" />
        </div>
        {expanded && (
          <>
            <div className="w-[130px] px-3 py-2">
              <Skeleton className="h-2 w-12" />
            </div>
            <div className="w-[100px] px-3 py-2">
              <Skeleton className="h-2 w-10" />
            </div>
            <div className="w-[100px] px-3 py-2">
              <Skeleton className="h-2 w-10" />
            </div>
          </>
        )}
      </div>
      {/* Rows */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} expanded={expanded} />
        ))}
      </div>
    </div>
  );
}

/**
 * Map loading skeleton.
 */
export function MapSkeleton() {
  return (
    <div className="h-full w-full rounded-xl border border-[var(--sysco-border)] bg-[var(--sysco-card)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-500/20 rounded-full animate-pulse" />
          </div>
        </div>
        <span className="font-mono text-sm">LOADING MAP...</span>
      </div>
    </div>
  );
}

/**
 * Agent card skeleton for War Room.
 */
export function AgentCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-16 rounded" />
      </div>
    </div>
  );
}

/**
 * Log terminal skeleton for War Room.
 */
export function LogTerminalSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black">
      {/* Terminal Header */}
      <div className="px-4 py-2 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </div>
      {/* Log rows */}
      <div className="flex-1 p-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 flex-1" style={{ maxWidth: `${60 + Math.random() * 40}%` }} />
          </div>
        ))}
        {/* Blinking cursor */}
        <div className="text-emerald-500 animate-pulse mt-2">_</div>
      </div>
    </div>
  );
}

/**
 * Full dashboard loading skeleton.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-[var(--sysco-bg)] overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-none z-30 bg-[var(--sysco-bg)]/80 backdrop-blur-xl border-b border-[var(--sysco-border)]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4 overflow-hidden">
        {/* KPI Strip */}
        <div className="flex-none grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>

        {/* Content Split */}
        <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
          {/* Map */}
          <div className="col-span-3 rounded-xl overflow-hidden border border-[var(--sysco-border)] bg-zinc-900/50 shadow-xl">
            <MapSkeleton />
          </div>
          {/* Table */}
          <div className="col-span-1">
            <TableSkeleton rows={10} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * War Room modal skeleton.
 */
export function WarRoomSkeleton() {
  return (
    <div className="flex-1 overflow-hidden grid grid-cols-12">
      {/* Left: Map placeholder */}
      <div className="col-span-8 border-r border-zinc-800 relative bg-zinc-900/50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        <div className="flex-1">
          <MapSkeleton />
        </div>
      </div>

      {/* Right: Intelligence Console */}
      <div className="col-span-4 flex flex-col bg-zinc-950">
        {/* Situation Report skeleton */}
        <div className="p-4 border-b border-zinc-800 bg-red-950/10">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        {/* Agent Cards skeleton */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-2 w-20" />
          </div>
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </div>

        {/* Log Terminal skeleton */}
        <LogTerminalSkeleton />
      </div>
    </div>
  );
}
