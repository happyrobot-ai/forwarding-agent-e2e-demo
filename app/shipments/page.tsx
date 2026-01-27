"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { CHANNELS } from "@/lib/channels";
import { cn } from "@/lib/utils";
import {
  Plane,
  AlertTriangle,
  Thermometer,
  Package,
  MapPin,
  Clock,
  TrendingUp,
  CheckCircle2
} from "lucide-react";

interface Shipment {
  id: string;
  shipmentId: string;
  mawbNumber: string;
  customerName: string;
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
  currentLocation?: string;
  progress: number;
  lastUpdate: string;
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Fetch shipments
  const fetchShipments = async () => {
    try {
      const response = await fetch('/api/shipments');
      const data = await response.json();
      setShipments(data);
      setIsLoading(false);
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
    channels: [CHANNELS.SHIPMENT_UPDATED, CHANNELS.BOOKING_CREATED],
    onEvent: (event) => {
      if (event.channel === CHANNELS.SHIPMENT_UPDATED || event.channel === CHANNELS.BOOKING_CREATED) {
        fetchShipments();
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ALERT':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'IN_TRANSIT':
      case 'IN_FLIGHT':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'ARRIVED':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'CUSTOMS_HOLD':
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'IN_FLIGHT': 'In Flight',
      'IN_TRANSIT': 'In Transit',
      'ARRIVED': 'Arrived',
      'CUSTOMS_HOLD': 'Customs Hold',
      'ALERT': 'Alert Active',
      'DEPARTING': 'Departing',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] dark:border-[#4D7CA8] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shipments...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'IN_FLIGHT').length,
    alerts: shipments.filter(s => s.status === 'ALERT').length,
    tempSensitive: shipments.filter(s => s.temperatureSensitive).length,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1D29]">
      {/* Header */}
      <div className="border-b border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#003366] dark:text-white">
                Air Freight Shipments
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time tracking and monitoring
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#003366] dark:text-white">
                  {stats.total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.inTransit}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Transit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.alerts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.tempSensitive}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Temp Control</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {shipments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No shipments yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Shipments will appear here when created
              </p>
            </div>
          ) : (
            shipments.map((shipment) => (
              <div
                key={shipment.id}
                onClick={() => setSelectedShipment(selectedShipment?.id === shipment.id ? null : shipment)}
                className={cn(
                  "border rounded-lg transition-all duration-200 cursor-pointer overflow-hidden",
                  shipment.status === 'ALERT'
                    ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
                    : "border-[#E8EAED] dark:border-[#3A3F52] bg-white dark:bg-[#24273A] hover:bg-[#F5F6F8] dark:hover:bg-[#2A2E42]",
                  selectedShipment?.id === shipment.id && "ring-2 ring-[#003366] dark:ring-[#4D7CA8]"
                )}
              >
                {/* Alert Banner */}
                {shipment.status === 'ALERT' && (
                  <div className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {shipment.alertType === 'TEMPERATURE_EXCURSION' && 'Temperature Alert Active'}
                      {shipment.alertType === 'CUSTOMS_DELAY' && 'Customs Delay'}
                    </span>
                  </div>
                )}

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {shipment.customerName}
                        </h3>
                        {shipment.temperatureSensitive && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
                            <Thermometer className="h-3 w-3" />
                            {shipment.temperatureMin}–{shipment.temperatureMax}°{shipment.temperatureUnit}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {shipment.shipmentId}
                      </p>
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-500">
                        MAWB: {shipment.mawbNumber}
                      </p>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold text-[#003366] dark:text-[#4D7CA8]">
                        {shipment.originCode}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {shipment.originName}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Plane className="h-5 w-5 text-gray-400 rotate-90" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold text-[#003366] dark:text-[#4D7CA8]">
                        {shipment.destinationCode}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {shipment.destinationName}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{shipment.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          shipment.status === 'ALERT'
                            ? "bg-red-600 dark:bg-red-500"
                            : "bg-[#003366] dark:bg-[#4D7CA8]"
                        )}
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Flight Info */}
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Plane className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {shipment.carrier} {shipment.flightNumber}
                    </span>
                  </div>

                  {/* Current Location */}
                  {shipment.currentLocation && (
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {shipment.currentLocation}
                      </span>
                    </div>
                  )}

                  {/* Status & Last Update */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md border",
                      getStatusColor(shipment.status)
                    )}>
                      {getStatusLabel(shipment.status)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(shipment.lastUpdate).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
