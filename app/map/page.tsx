"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSSE } from "@/hooks/useSSE";
import { CHANNELS } from "@/lib/channels";
import { cn } from "@/lib/utils";
import { Plane, AlertTriangle, MapPin, Activity } from "lucide-react";
import { TemperatureAlertModal } from "@/components/TemperatureAlertModal";

// Dynamic import for map (avoid SSR issues)
const AirFreightMap = dynamic(
  () => import("@/components/AirFreightMap").then((mod) => ({ default: mod.AirFreightMap })),
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

interface Shipment {
  id: string;
  shipmentId: string;
  mawbNumber: string;
  customerName: string;
  customerCode: string;
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
  carrier: string;
  flightNumber: string;
  status: string;
  alertType?: string;
  alertSeverity?: string;
  temperatureSensitive: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureUnit?: string;
  currentLat?: number;
  currentLng?: number;
  currentLocation?: string;
  progress: number;
  lastUpdate: string;
  milestones?: ShipmentMilestone[];
}

interface ShipmentMilestone {
  code: string;
  description: string;
  location: string;
  actual: string | null;
  status: string;
  temperature?: number;
  alert?: {
    type: string;
    severity: string;
    threshold: number;
    reading: number;
    message: string;
  };
}

export default function MapPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Fetch shipments
  const fetchShipments = async () => {
    try {
      const response = await fetch('/api/shipments');
      const data = await response.json();
      setShipments(data);
      setIsLoading(false);

      // Check for temperature alerts
      const alertShipment = data.find((s: Shipment) => s.status === 'ALERT' && s.alertType === 'TEMPERATURE_EXCURSION');
      if (alertShipment && !showAlertModal) {
        setSelectedShipmentId(alertShipment.shipmentId);
        // Auto-show alert modal after 2 seconds for demo
        setTimeout(() => setShowAlertModal(true), 2000);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // Real-time updates via SSE
  useSSE({
    channels: [CHANNELS.SHIPMENT_UPDATED, CHANNELS.TEMPERATURE_ALERT],
    onEvent: (event) => {
      if (event.channel === CHANNELS.TEMPERATURE_ALERT) {
        // Show alert modal when temperature alert arrives
        setShowAlertModal(true);
      }
      fetchShipments();
    },
  });

  // Get selected shipment and its alert
  const selectedShipment = useMemo(() => {
    return shipments.find(s => s.shipmentId === selectedShipmentId);
  }, [shipments, selectedShipmentId]);

  const temperatureAlert = useMemo(() => {
    if (!selectedShipment || selectedShipment.status !== 'ALERT') return null;

    // Fetch milestone with alert from shipment
    // For now, create from shipment data
    return {
      type: 'TEMPERATURE_EXCURSION',
      severity: selectedShipment.alertSeverity || 'CRITICAL',
      threshold: selectedShipment.temperatureMax || 8,
      reading: 9.4, // This would come from milestone data
      message: `Temperature deviated from ${selectedShipment.temperatureMin}–${selectedShipment.temperatureMax}°${selectedShipment.temperatureUnit} range`,
      timestamp: selectedShipment.lastUpdate,
      location: selectedShipment.currentLocation || selectedShipment.destinationName,
    };
  }, [selectedShipment]);

  const stats = {
    total: shipments.length,
    inFlight: shipments.filter(s => s.status === 'IN_FLIGHT').length,
    alerts: shipments.filter(s => s.status === 'ALERT').length,
    tempSensitive: shipments.filter(s => s.temperatureSensitive).length,
  };

  // Get alert shipments for manual trigger
  const alertShipments = shipments.filter(s => s.status === 'ALERT' && s.alertType === 'TEMPERATURE_EXCURSION');

  // Handler to manually show alert
  const handleShowAlert = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setShowAlertModal(true);
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
                Global Air Freight Map
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Live tracking and monitoring
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
                  {stats.inFlight}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Flight</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  {stats.alerts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Alerts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Map Container */}
        <div className="flex-1 relative">
          <AirFreightMap
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
                <span className="text-gray-700 dark:text-gray-300">In Flight</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-gray-700 dark:text-gray-300">Alert Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#003366] rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Airport</span>
              </div>
            </div>
          </div>

          {/* Active Alerts Button */}
          {alertShipments.length > 0 && (
            <div className="absolute top-6 left-6">
              <button
                onClick={() => handleShowAlert(alertShipments[0].shipmentId)}
                className="flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-all hover:shadow-xl animate-pulse"
              >
                <AlertTriangle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold text-sm">
                    {alertShipments.length} Critical Alert{alertShipments.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-xs opacity-90">Click to view</div>
                </div>
              </button>
            </div>
          )}
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
          {selectedShipment && selectedShipment.milestones ? (
            <div className="p-4 space-y-4">
              {/* Shipment Header */}
              <div className="bg-[#F5F6F8] dark:bg-[#2A2E42] rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {selectedShipment.customerName}
                    </h3>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {selectedShipment.mawbNumber}
                    </p>
                  </div>
                  {selectedShipment.status === 'ALERT' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      ALERT
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Route:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedShipment.originCode} → {selectedShipment.destinationCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Flight:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedShipment.carrier} {selectedShipment.flightNumber}
                    </span>
                  </div>
                  {selectedShipment.currentLocation && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {selectedShipment.currentLocation}
                      </span>
                    </div>
                  )}
                  {selectedShipment.temperatureSensitive && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Temp Range:</span>
                      <span className="font-semibold text-orange-700 dark:text-orange-400">
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
                    className="h-full bg-[#003366] dark:bg-[#4D7CA8] transition-all"
                    style={{ width: `${selectedShipment.progress}%` }}
                  />
                </div>
              </div>

              {/* Milestones */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Journey Milestones
                </h4>
                <div className="space-y-3">
                  {selectedShipment.milestones?.map((milestone: any, index: number) => (
                    <div key={milestone.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2",
                          milestone.status === 'COMPLETED'
                            ? "bg-green-500 border-green-500"
                            : milestone.status === 'PENDING'
                            ? "bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600"
                            : "bg-blue-500 border-blue-500"
                        )} />
                        {index < (selectedShipment.milestones?.length ?? 0) - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-600 flex-1 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {milestone.description}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {milestone.location}
                          {milestone.actual && ` • ${new Date(milestone.actual).toLocaleString()}`}
                        </p>
                        {milestone.temperature && (
                          <p className={cn(
                            "text-xs font-medium mt-1",
                            milestone.alert ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                          )}>
                            🌡️ {milestone.temperature}°C
                            {milestone.alert && ` - ${milestone.alert.message}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Shipment List */
            <div className="divide-y divide-[#E8EAED] dark:divide-[#3A3F52]">
              {shipments.map((shipment) => (
              <div
                key={shipment.id}
                onClick={() => {
                  setSelectedShipmentId(shipment.shipmentId);
                  // If it's an alert, also show the modal
                  if (shipment.status === 'ALERT' && shipment.alertType === 'TEMPERATURE_EXCURSION') {
                    setShowAlertModal(true);
                  }
                }}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  selectedShipmentId === shipment.shipmentId
                    ? "bg-[#F5F6F8] dark:bg-[#2A2E42]"
                    : "hover:bg-[#FAFBFC] dark:hover:bg-[#1F2232]",
                  shipment.status === 'ALERT' && "bg-red-50/50 dark:bg-red-900/10 border-l-4 border-red-600"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {shipment.customerName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {shipment.mawbNumber}
                    </div>
                  </div>
                  {shipment.status === 'ALERT' && (
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-2">
                  <span className="font-medium">{shipment.originCode}</span>
                  <Plane className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">{shipment.destinationCode}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Activity className="h-3 w-3" />
                  <span>{shipment.carrier} {shipment.flightNumber}</span>
                </div>

                {shipment.currentLocation && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{shipment.currentLocation}</span>
                  </div>
                )}

                {shipment.temperatureSensitive && (
                  <div className="mt-2 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium">
                      🌡️ {shipment.temperatureMin}–{shipment.temperatureMax}°{shipment.temperatureUnit}
                    </span>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Temperature Alert Modal */}
      {showAlertModal && selectedShipment && temperatureAlert && (
        <TemperatureAlertModal
          shipment={selectedShipment}
          alert={temperatureAlert}
          onClose={() => setShowAlertModal(false)}
        />
      )}
    </div>
  );
}
