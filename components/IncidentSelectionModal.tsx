"use client";

import { useState } from "react";
import { X, AlertTriangle, Truck, DollarSign, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface TruckInfo {
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
  truck?: TruckInfo | null;
  origin: string;
  destination: string;
  riskScore: number;
}

interface IncidentSelectionModalProps {
  orders: Order[];
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  isTriggering: boolean;
}

export function IncidentSelectionModal({
  orders,
  onClose,
  onSelectOrder,
  isTriggering,
}: IncidentSelectionModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Filter to only show in-transit orders with assigned trucks
  const eligibleOrders = orders.filter(
    (order) => order.status === "IN_TRANSIT" && order.truck && order.riskScore < 80
  );

  const handleTrigger = () => {
    if (selectedOrderId) {
      onSelectOrder(selectedOrderId);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl",
        "bg-zinc-900 border border-zinc-800 shadow-2xl"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Simulate Incident</h2>
              <p className="text-xs text-zinc-500 font-mono">
                SELECT ORDER TO TRIGGER CRISIS SCENARIO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Order List */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {eligibleOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No eligible orders for incident simulation</p>
              <p className="text-xs text-zinc-600 mt-1">
                Orders must be in transit with assigned trucks
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eligibleOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all",
                      isSelected
                        ? "bg-red-500/10 border-red-500/50 ring-1 ring-red-500/30"
                        : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Order ID & Truck */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "font-mono font-semibold",
                            isSelected ? "text-red-400" : "text-white"
                          )}>
                            {order.id}
                          </span>
                          {order.truck && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {order.truck.id}
                            </span>
                          )}
                        </div>

                        {/* Driver */}
                        {order.truck && (
                          <p className="text-sm text-zinc-400 mb-1">
                            Driver: <span className="text-zinc-300">{order.truck.driverName}</span>
                          </p>
                        )}

                        {/* Route */}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                          <MapPin className="h-3 w-3" />
                          <span>{order.origin}</span>
                          <span className="text-zinc-600">→</span>
                          <span>{order.destination}</span>
                        </div>

                        {/* Payload */}
                        <p className="text-xs text-zinc-400 truncate">{order.itemName}</p>
                        {order.description && (
                          <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                            {order.description}
                          </p>
                        )}
                      </div>

                      {/* Order Value */}
                      {order.orderValue !== undefined && order.orderValue > 0 && (
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-sm font-mono",
                          isSelected ? "bg-red-500/20 text-red-300" : "bg-emerald-500/10 text-emerald-400"
                        )}>
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(order.orderValue).replace("$", "")}
                        </div>
                      )}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-red-500/20">
                        <p className="text-xs text-red-400 font-mono flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          SELECTED FOR INCIDENT SIMULATION
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-mono">
            {eligibleOrders.length} orders available
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTrigger}
              disabled={!selectedOrderId || isTriggering}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                selectedOrderId && !isTriggering
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isTriggering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Trigger Incident
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
