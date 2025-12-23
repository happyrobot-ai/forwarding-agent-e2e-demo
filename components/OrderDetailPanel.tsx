"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, MapPin, Clock, CheckCircle2, Truck, Package, 
  DollarSign, FileCheck, AlertTriangle, Users, FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TruckData {
  id: string;
  driverName: string;
  vehicleType: string;
  status: string;
}

interface Buyer {
  id: string;
  name: string;
  segment: string;
  trustScore?: number;
}

interface Order {
  id: string;
  itemName: string;
  description?: string | null;
  orderValue?: number;
  status: string;
  carrier: string;
  truckId?: string | null;
  truck?: TruckData | null;
  origin: string;
  destination: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  riskScore: number;
  progress?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  departedAt?: string | null;
  estimatedArrival?: string | null;
  actualArrival?: string | null;
  costPrice?: number;
  sellPrice?: number;
  internalBaseCost?: number;
  actualLogisticsCost?: number;
  buyers?: Buyer[];
}

interface OrderDetailPanelProps {
  order: Order;
  onClose: () => void;
  isIncidentActive?: boolean;
  isIncidentResolved?: boolean; // When true, shows War Room button for historical viewing
  incidentDescription?: string | null;
  onOpenWarRoom?: () => void;
  elevated?: boolean; // When true, uses higher z-index to float above War Room backdrop
}

// Reuse your existing helpers
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Arriving now";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1609.34).toFixed(0)} mi`;
}

export function OrderDetailPanel({ order, onClose, isIncidentActive, isIncidentResolved, incidentDescription, onOpenWarRoom, elevated }: OrderDetailPanelProps) {
  // State to toggle views: 'impact' (Crisis view) vs 'logistics' (Normal view)
  // If order is at risk, default to 'impact', otherwise 'logistics'
  const isAtRisk = order.status === "AT_RISK" || order.riskScore >= 80 || order.status === "CANCELLED";
  const [activeTab, setActiveTab] = useState<'impact' | 'logistics'>(isAtRisk ? 'impact' : 'logistics');

  // Track previous state to detect transitions
  const prevOrderIdRef = useRef(order.id);
  const prevIsAtRiskRef = useRef(isAtRisk);

  useEffect(() => {
    // When a NEW order is selected, set tab based on risk status
    if (prevOrderIdRef.current !== order.id) {
      setActiveTab(isAtRisk ? 'impact' : 'logistics');
      prevOrderIdRef.current = order.id;
      prevIsAtRiskRef.current = isAtRisk;
    }
    // When the SAME order transitions to at-risk, auto-switch to Impact Analysis
    else if (!prevIsAtRiskRef.current && isAtRisk) {
      setActiveTab('impact');
      prevIsAtRiskRef.current = isAtRisk;
    }
  }, [order.id, isAtRisk]);

  const progress = order.progress ?? 50;
  const isDelivered = order.status === "DELIVERED";
  const isConfirmed = order.status === "CONFIRMED";
  const isInTransit = order.status === "IN_TRANSIT";

  // Timing Logic
  const now = new Date();
  const estimatedArrival = order.estimatedArrival ? new Date(order.estimatedArrival) : null;
  let estimatedDelivery: string;
  if (estimatedArrival) {
    const msRemaining = estimatedArrival.getTime() - now.getTime();
    estimatedDelivery = formatTimeRemaining(msRemaining);
  } else {
    estimatedDelivery = "Calculating...";
  }

  // Financials
  const costPrice = order.costPrice ?? 0;
  const sellPrice = order.sellPrice ?? order.orderValue ?? 0;
  const logisticsCost = order.actualLogisticsCost ?? 0;
  const overheadCost = order.internalBaseCost ?? 0;
  const totalCost = costPrice + logisticsCost + overheadCost;
  const margin = sellPrice - totalCost;
  const marginPercent = totalCost > 0 ? ((margin / totalCost) * 100).toFixed(1) : "0";


  return (
    <div className={cn(
      "absolute top-4 left-4 bottom-4 w-[340px] animate-in slide-in-from-left-2 duration-200 flex flex-col",
      elevated ? "z-[200]" : "z-30" // z-[200] floats above map markers (z-10) in War Room
    )}>
      <div className={cn(
        "backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 max-h-full",
        // Dynamic border color based on tab state
        activeTab === 'impact' && isAtRisk ? "bg-black/90 border-red-900/50" : "bg-black/90 border-zinc-700"
      )}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-400" />
            <span className="font-mono text-sm text-white font-semibold">{order.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* War Room Button + HappyRobot Logo (show for active OR resolved incidents, NOT when already in War Room) */}
            {(isIncidentActive || isIncidentResolved) && onOpenWarRoom && !elevated && (
              <button
                onClick={onOpenWarRoom}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all text-[10px] font-medium cursor-pointer",
                  isIncidentActive
                    ? "bg-red-900/30 border-red-800/50 text-red-300 hover:bg-red-900/50 animate-pulse"
                    : "bg-emerald-900/30 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50"
                )}
              >
                <img
                  src="/happyrobot/Footer-logo-white.png"
                  alt="HappyRobot"
                  className="h-3 w-auto opacity-70"
                />
                {isIncidentResolved ? "View Resolution" : "War Room"}
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded transition-colors">
              <X className="h-4 w-4 text-zinc-500 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Tab Switcher (Only visible if At Risk) */}
        {isAtRisk && (
          <div className="px-4 pt-3 pb-1">
            <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('impact')}
                className={cn(
                  "flex items-center justify-center gap-2 py-1.5 text-[10px] font-medium rounded-md transition-all",
                  activeTab === 'impact' 
                    ? "bg-red-900/40 text-red-200 shadow-sm border border-red-900/50" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                Impact Analysis
              </button>
              <button
                onClick={() => setActiveTab('logistics')}
                className={cn(
                  "flex items-center justify-center gap-2 py-1.5 text-[10px] font-medium rounded-md transition-all",
                  activeTab === 'logistics' 
                    ? "bg-zinc-800 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <FileText className="h-3 w-3" />
                Logistics Detail
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW A: IMPACT ANALYSIS (Crisis Mode) --- */}
        {activeTab === 'impact' && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Incident Description */}
            {incidentDescription && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Incident</div>
                    <div className="text-sm text-zinc-200">{incidentDescription}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Financial Impact Card - Total Exposure */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-lg p-4 border border-zinc-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="h-12 w-12 text-zinc-100" /></div>
               <div className="relative z-10">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Exposure</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-white">${(sellPrice + costPrice).toLocaleString()}</span>
                    <span className="text-xs text-red-400 font-mono">(-${margin.toLocaleString()} Margin)</span>
                  </div>
                  <div className="mt-2 text-[10px] text-zinc-500 space-y-0.5">
                    <div>Revenue: <span className="text-zinc-300">${sellPrice.toLocaleString()}</span></div>
                    <div>Product: <span className="text-zinc-300">${costPrice.toLocaleString()}</span></div>
                  </div>
                  <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-full animate-pulse" />
                  </div>
               </div>
            </div>

            {/* 2. Client Impact List */}
            <div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                <Users className="h-3 w-3" />
                Affected Clients ({order.buyers?.length || 0})
              </div>
              <div className="space-y-2">
                {order.buyers?.slice(0, 3).map(buyer => (
                  <div key={buyer.id} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
                    <div className="flex items-center gap-2">
                       <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 border border-zinc-700">
                          {buyer.name[0]}
                       </div>
                       <div>
                         <div className="text-xs text-zinc-200 font-medium">{buyer.name.split('-')[0]}</div>
                         <div className="text-[10px] text-zinc-500">{buyer.segment}</div>
                       </div>
                    </div>
                    {/* Trust Score Badge */}
                    <div className="text-right">
                       <div className="text-[10px] text-zinc-500">Trust</div>
                       <div className={cn(
                         "text-xs font-mono font-bold",
                         (buyer.trustScore ?? 95) >= 90 ? "text-emerald-400" :
                         (buyer.trustScore ?? 95) >= 70 ? "text-orange-400" : "text-red-400"
                       )}>
                         {buyer.trustScore ?? 95}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* --- VIEW B: LOGISTICS DETAIL (Standard View) --- */}
        {activeTab === 'logistics' && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">

             {/* Route Block - Horizontal Layout */}
             <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <MapPin className="h-3 w-3" /> Route
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {order.distanceMeters ? formatDistance(order.distanceMeters) : '--'}
                    {order.durationSeconds ? ` • ${formatDuration(order.durationSeconds)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Origin */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-500">Origin</div>
                        <div className="text-xs text-zinc-300 font-medium truncate">{order.origin}</div>
                      </div>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="flex items-center gap-1 px-2 shrink-0">
                    <div className="w-8 h-0.5 bg-zinc-700" />
                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-zinc-700" />
                  </div>
                  {/* Destination */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", isAtRisk ? "bg-red-500" : "bg-blue-500")} />
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-500">Destination</div>
                        <div className="text-xs text-white font-medium truncate">{order.destination}</div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             {/* Driver Block */}
             {order.truck && (
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                  <Truck className="h-3 w-3" /> Assigned Asset
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-zinc-400" />
                     </div>
                     <div>
                        <div className="text-sm text-white font-medium">{order.truck.driverName}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{order.truck.vehicleType} • {order.truck.id}</div>
                     </div>
                  </div>
                </div>
              </div>
             )}

             {/* Timing & Payload Block */}
             <div className="grid grid-cols-2 gap-3">
               <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    <Clock className="h-3 w-3" /> ETA
                  </div>
                  <div className="text-sm text-white font-medium">{estimatedDelivery}</div>
               </div>
               <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    <Package className="h-3 w-3" /> Payload
                  </div>
                  <div className="text-sm text-white font-medium truncate">{order.itemName}</div>
               </div>
             </div>

             {/* Financial Breakdown */}
             <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
                  <DollarSign className="h-3 w-3" /> Financial Breakdown
                </div>

                {/* Cost Section */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Product Cost (COGS)</span>
                    <span className="text-zinc-300 font-mono">${costPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Logistics Cost</span>
                    <span className="text-zinc-300 font-mono">${logisticsCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Overhead</span>
                    <span className="text-zinc-300 font-mono">${overheadCost.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Total Cost</span>
                    <span className="text-zinc-200 font-mono font-medium">${totalCost.toLocaleString()}</span>
                  </div>
                </div>

                {/* Revenue & Margin */}
                <div className="border-t border-zinc-700 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Sell Price</span>
                    <span className="text-white font-mono font-bold">${sellPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Net Margin</span>
                    <span className={cn(
                      "font-mono font-bold",
                      margin >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {margin >= 0 ? '+' : ''}${margin.toLocaleString()} ({marginPercent}%)
                    </span>
                  </div>
                </div>
             </div>

             {/* Carrier Info */}
             <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                  <FileCheck className="h-3 w-3" /> Carrier
                </div>
                <div className="text-sm text-white font-medium">{order.carrier}</div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}