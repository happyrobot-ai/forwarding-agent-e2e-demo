"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSSE } from "@/hooks/useSSE";
import { CHANNELS } from "@/lib/channels";
import { cn } from "@/lib/utils";
import { Truck, AlertTriangle, MapPin, Activity, Thermometer, Package } from "lucide-react";

// Dynamic import for map (avoid SSR issues)
const GroundFreightMap = dynamic(
  () => import("@/components/GroundFreightMap").then((mod) => ({ default: mod.GroundFreightMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#1A1D29]">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-[#4D7CA8] rounded-full animate-spin" />
          <span className="font-mono text-sm">LOADING MAP...</span>
        </div>
      </div>
    ),
  }
);

interface GroundShipment {
  id: string;
  shipmentId: string;
  proNumber: string;
  customerName: string;
  customerCode: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  carrier: string;
  equipment: string;
  status: string;
  alertType?: string;
  alertSeverity?: string;
  temperatureControlled: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureUnit?: string;
  currentLat?: number;
  currentLng?: number;
  currentLocation?: string;
  progress: number;
  lastUpdate: string;
  driver?: string;
  truckNumber?: string;
}

// Mock ground freight shipments for demo
const DEMO_SHIPMENTS: GroundShipment[] = [
  {
    id: "1",
    shipmentId: "CEVA-GF-001",
    proNumber: "PRO-78234567",
    customerName: "Ferrari",
    customerCode: "FERRARI",
    originCity: "Miami",
    originState: "FL",
    destinationCity: "Dallas",
    destinationState: "TX",
    carrier: "CEVA Ground",
    equipment: "Enclosed Auto",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 45,
    lastUpdate: new Date().toISOString(),
    driver: "Carlos Mendez",
    truckNumber: "TRK-4521",
  },
  {
    id: "2",
    shipmentId: "CEVA-GF-002",
    proNumber: "PRO-78234568",
    customerName: "Ferrari",
    customerCode: "FERRARI",
    originCity: "Los Angeles",
    originState: "CA",
    destinationCity: "Scottsdale",
    destinationState: "AZ",
    carrier: "CEVA Ground",
    equipment: "Enclosed Auto",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 72,
    lastUpdate: new Date().toISOString(),
    driver: "Michael Torres",
    truckNumber: "TRK-4522",
  },
  {
    id: "3",
    shipmentId: "CEVA-GF-003",
    proNumber: "PRO-78234569",
    customerName: "Sysco",
    customerCode: "SYSCO",
    originCity: "Houston",
    originState: "TX",
    destinationCity: "Dallas",
    destinationState: "TX",
    carrier: "CEVA Reefer",
    equipment: "Reefer",
    status: "IN_TRANSIT",
    temperatureControlled: true,
    temperatureMin: 34,
    temperatureMax: 38,
    temperatureUnit: "F",
    progress: 60,
    lastUpdate: new Date().toISOString(),
    driver: "James Wilson",
    truckNumber: "TRK-REEF-101",
  },
  {
    id: "4",
    shipmentId: "CEVA-GF-004",
    proNumber: "PRO-78234570",
    customerName: "Tyson Foods",
    customerCode: "TYSON",
    originCity: "Springdale",
    originState: "AR",
    destinationCity: "Atlanta",
    destinationState: "GA",
    carrier: "CEVA Reefer",
    equipment: "Reefer",
    status: "IN_TRANSIT",
    temperatureControlled: true,
    temperatureMin: 28,
    temperatureMax: 32,
    temperatureUnit: "F",
    progress: 75,
    lastUpdate: new Date().toISOString(),
    driver: "Robert Chen",
    truckNumber: "TRK-REEF-205",
  },
  {
    id: "5",
    shipmentId: "CEVA-GF-005",
    proNumber: "PRO-78234571",
    customerName: "Target",
    customerCode: "TARGET",
    originCity: "Minneapolis",
    originState: "MN",
    destinationCity: "Chicago",
    destinationState: "IL",
    carrier: "CEVA Ground",
    equipment: "Dry Van",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 55,
    lastUpdate: new Date().toISOString(),
    driver: "David Park",
    truckNumber: "TRK-6789",
  },
  {
    id: "6",
    shipmentId: "CEVA-GF-006",
    proNumber: "PRO-78234572",
    customerName: "Home Depot",
    customerCode: "HOMEDEPOT",
    originCity: "Atlanta",
    originState: "GA",
    destinationCity: "Miami",
    destinationState: "FL",
    carrier: "CEVA Ground",
    equipment: "Flatbed",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 30,
    lastUpdate: new Date().toISOString(),
    driver: "Kevin Brown",
    truckNumber: "TRK-FLAT-302",
  },
  {
    id: "7",
    shipmentId: "CEVA-GF-007",
    proNumber: "PRO-78234573",
    customerName: "Caterpillar",
    customerCode: "CAT",
    originCity: "Peoria",
    originState: "IL",
    destinationCity: "Houston",
    destinationState: "TX",
    carrier: "CEVA Heavy Haul",
    equipment: "Lowboy",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 40,
    lastUpdate: new Date().toISOString(),
    driver: "Thomas Reed",
    truckNumber: "TRK-LOWB-401",
  },
  {
    id: "8",
    shipmentId: "CEVA-GF-008",
    proNumber: "PRO-78234574",
    customerName: "Amazon",
    customerCode: "AMAZON",
    originCity: "Seattle",
    originState: "WA",
    destinationCity: "Los Angeles",
    destinationState: "CA",
    carrier: "CEVA Ground",
    equipment: "Dry Van",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 65,
    lastUpdate: new Date().toISOString(),
    driver: "Lisa Chang",
    truckNumber: "TRK-9012",
  },
  {
    id: "9",
    shipmentId: "CEVA-GF-009",
    proNumber: "PRO-78234575",
    customerName: "General Motors",
    customerCode: "GM",
    originCity: "Detroit",
    originState: "MI",
    destinationCity: "Dallas",
    destinationState: "TX",
    carrier: "CEVA Ground",
    equipment: "Auto Carrier",
    status: "IN_TRANSIT",
    temperatureControlled: false,
    progress: 25,
    lastUpdate: new Date().toISOString(),
    driver: "Anthony Martinez",
    truckNumber: "TRK-AUTO-501",
  },
  {
    id: "10",
    shipmentId: "CEVA-GF-010",
    proNumber: "PRO-78234576",
    customerName: "Ferrari",
    customerCode: "FERRARI",
    originCity: "New York",
    originState: "NY",
    destinationCity: "Palm Beach",
    destinationState: "FL",
    carrier: "CEVA Ground",
    equipment: "Enclosed Auto",
    status: "DELIVERED",
    temperatureControlled: false,
    progress: 100,
    lastUpdate: new Date().toISOString(),
    driver: "Marcus Johnson",
    truckNumber: "TRK-4523",
  },
];

export default function MapPage() {
  const [shipments, setShipments] = useState<GroundShipment[]>(DEMO_SHIPMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  // Real-time updates via SSE (for future use)
  useSSE({
    channels: [CHANNELS.SHIPMENT_UPDATED],
    onEvent: () => {
      // In production, this would refetch shipments
    },
  });

  // Get selected shipment
  const selectedShipment = useMemo(() => {
    return shipments.find(s => s.shipmentId === selectedShipmentId);
  }, [shipments, selectedShipmentId]);

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    alerts: shipments.filter(s => s.status === 'ALERT').length,
    reefer: shipments.filter(s => s.temperatureControlled).length,
  };

  const getEquipmentIcon = (equipment: string) => {
    if (equipment.toLowerCase().includes('reefer')) return <Thermometer className="h-3 w-3" />;
    if (equipment.toLowerCase().includes('flatbed') || equipment.toLowerCase().includes('lowboy')) return <Package className="h-3 w-3" />;
    return <Truck className="h-3 w-3" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'IN_TRANSIT': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'DELIVERED': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'ALERT': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      'PENDING': 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
    };
    return styles[status] || styles['PENDING'];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] dark:border-[#4D7CA8] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#1A1D29]">
      {/* Header */}
      <div className="flex-none border-b border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] z-10">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#003366] dark:text-white">
                Ground Freight Tracking
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Live US ground shipment monitoring
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  LIVE
                </span>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[#003366] dark:text-white">
                  {stats.total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Shipments</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.inTransit}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Transit</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {stats.reefer}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Reefer</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Map Container */}
        <div className="flex-1 relative">
          <GroundFreightMap
            shipments={shipments}
            onShipmentClick={setSelectedShipmentId}
            highlightedShipmentId={selectedShipmentId}
          />

          {/* Legend */}
          <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-[#24273A]/95 backdrop-blur-sm border border-[#E8EAED] dark:border-[#3A3F52] rounded-lg p-4 shadow-lg">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
              Legend
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">In Transit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Reefer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#003366] rounded rotate-45"></div>
                <span className="text-gray-700 dark:text-gray-300">Origin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#4D7CA8] rounded rotate-45"></div>
                <span className="text-gray-700 dark:text-gray-300">Destination</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Shipment List or Detail View */}
        <div className="w-96 border-l border-[#E8EAED] dark:border-[#3A3F52] bg-white dark:bg-[#24273A] overflow-y-auto">
          <div className="p-4 border-b border-[#E8EAED] dark:border-[#3A3F52] flex items-center justify-between">
            {selectedShipment ? (
              <>
                <button
                  onClick={() => setSelectedShipmentId(null)}
                  className="text-sm text-[#003366] dark:text-[#4D7CA8] hover:underline"
                >
                  ← Back to List
                </button>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Shipment Details
                </h2>
              </>
            ) : (
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Active Shipments
              </h2>
            )}
          </div>

          {/* Detailed View */}
          {selectedShipment ? (
            <div className="p-4 space-y-4">
              {/* Shipment Header */}
              <div className="bg-[#F5F6F8] dark:bg-[#2A2E42] rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {selectedShipment.customerName}
                    </h3>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {selectedShipment.proNumber}
                    </p>
                  </div>
                  <span className={cn("px-2 py-1 rounded text-xs font-semibold", getStatusBadge(selectedShipment.status))}>
                    {selectedShipment.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Route:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedShipment.originCity}, {selectedShipment.originState} → {selectedShipment.destinationCity}, {selectedShipment.destinationState}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Equipment:</span>
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                      {getEquipmentIcon(selectedShipment.equipment)}
                      {selectedShipment.equipment}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Carrier:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedShipment.carrier}
                    </span>
                  </div>
                  {selectedShipment.driver && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Driver:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selectedShipment.driver}
                      </span>
                    </div>
                  )}
                  {selectedShipment.truckNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Truck:</span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {selectedShipment.truckNumber}
                      </span>
                    </div>
                  )}
                  {selectedShipment.temperatureControlled && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Temp Range:</span>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {selectedShipment.temperatureMin}–{selectedShipment.temperatureMax}°{selectedShipment.temperatureUnit}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{selectedShipment.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      selectedShipment.temperatureControlled ? "bg-green-500" :
                      "bg-[#003366] dark:bg-[#4D7CA8]"
                    )}
                    style={{ width: `${selectedShipment.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Shipment List */
            <div className="divide-y divide-[#E8EAED] dark:divide-[#3A3F52]">
              {shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  onClick={() => setSelectedShipmentId(shipment.shipmentId)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedShipmentId === shipment.shipmentId
                      ? "bg-[#F5F6F8] dark:bg-[#2A2E42]"
                      : "hover:bg-[#FAFBFC] dark:hover:bg-[#1F2232]"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {shipment.customerName}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {shipment.proNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">{shipment.originCity}, {shipment.originState}</span>
                    <Truck className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{shipment.destinationCity}, {shipment.destinationState}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {getEquipmentIcon(shipment.equipment)}
                    <span>{shipment.equipment}</span>
                    <span className="text-gray-400">•</span>
                    <span>{shipment.progress}%</span>
                  </div>

                  {shipment.temperatureControlled && (
                    <div className="mt-2 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        <Thermometer className="h-3 w-3 mr-1" />
                        {shipment.temperatureMin}–{shipment.temperatureMax}°{shipment.temperatureUnit}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
