"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Phone, Thermometer, MapPin, Package, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHappyRobot } from "@/hooks/useHappyRobot";
import { cn } from "@/lib/utils";

interface Shipment {
  shipmentId: string;
  mawbNumber: string;
  customerName: string;
  customerCode: string;
  carrier: string;
  flightNumber: string;
  currentLocation?: string;
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureUnit?: string;
}

interface TemperatureAlert {
  type: string;
  severity: string;
  threshold: number;
  reading: number;
  message: string;
  timestamp: string;
  location: string;
}

interface TemperatureAlertModalProps {
  shipment: Shipment;
  alert: TemperatureAlert;
  onClose: () => void;
}

export function TemperatureAlertModal({
  shipment,
  alert,
  onClose,
}: TemperatureAlertModalProps) {
  const [callInitiated, setCallInitiated] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'view_platform' | 'failed'>('idle');
  const [platformUrl, setPlatformUrl] = useState<string | null>(null);

  const { runs, trigger, isLoading: runsLoading } = useHappyRobot({
    contextId: shipment.shipmentId,
    contextType: 'temperature_alert',
  });

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleProceedToCall = async () => {
    setCallInitiated(true);
    setCallStatus('calling');

    try {
      const result = await trigger({
        contextType: 'temperature_alert',
        contextId: shipment.shipmentId,
        name: `Temperature Alert - ${shipment.customerName}`,
        description: `Outbound call for temperature excursion on ${shipment.mawbNumber}`,

        // Workflow data
        shipmentId: shipment.shipmentId,
        mawbNumber: shipment.mawbNumber,
        customerName: shipment.customerName,
        customerCode: shipment.customerCode,
        alert: {
          type: alert.type,
          severity: alert.severity,
          currentTemp: alert.reading,
          thresholdTemp: alert.threshold,
          message: alert.message,
          location: alert.location,
        },
        flight: {
          carrier: shipment.carrier,
          flightNumber: shipment.flightNumber,
          currentLocation: shipment.currentLocation,
        },
      });

      // Get platform URL from the result
      if (result?.runs?.[0]?.platformUrl) {
        setPlatformUrl(result.runs[0].platformUrl);
      }

      // Show "Calling Carrier..." for 3 seconds, then show "View on Platform"
      setTimeout(() => {
        setCallStatus('view_platform');

        // After 5 more seconds, reset to initial state
        setTimeout(() => {
          setCallInitiated(false);
          setCallStatus('idle');
        }, 5000);
      }, 3000);
    } catch (error) {
      console.error('Failed to trigger call workflow:', error);
      setCallStatus('failed');
    }
  };

  const handleViewPlatform = () => {
    if (platformUrl) {
      window.open(platformUrl, '_blank');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'WARNING':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white dark:bg-[#24273A] rounded-xl shadow-2xl border border-[#E8EAED] dark:border-[#3A3F52] w-full max-w-2xl overflow-hidden"
        >
          {/* Critical Alert Header */}
          <div className={cn(
            "px-6 py-4 flex items-center justify-between",
            getSeverityColor(alert.severity)
          )}>
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {alert.severity} TEMPERATURE ALERT
                </h2>
                <p className="text-sm opacity-90 font-mono mt-0.5">
                  {shipment.mawbNumber} • {shipment.flightNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Temperature Details */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-red-600 dark:bg-red-700 flex items-center justify-center flex-shrink-0">
                  <Thermometer className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                    Temperature Excursion Detected
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-red-700 dark:text-red-400">Current Reading:</span>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-200 font-mono">
                        {alert.reading}°{shipment.temperatureUnit || 'C'}
                      </div>
                    </div>
                    <div>
                      <span className="text-red-700 dark:text-red-400">Allowed Range:</span>
                      <div className="text-lg font-semibold text-red-900 dark:text-red-200 font-mono">
                        {shipment.temperatureMin}–{shipment.temperatureMax}°{shipment.temperatureUnit || 'C'}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-300 mt-3">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Customer</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {shipment.customerName}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Location</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {alert.location}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Detected At</div>
                  <div className="font-semibold text-gray-900 dark:text-white font-mono text-sm">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Call Status */}
            {callInitiated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "border rounded-lg p-4",
                  callStatus === 'calling' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                  callStatus === 'view_platform' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                  callStatus === 'failed' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}
              >
                <div className="flex items-center gap-3">
                  {callStatus === 'calling' && (
                    <>
                      <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                      <div>
                        <div className="font-semibold text-blue-900 dark:text-blue-200">
                          Calling Carrier...
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Connecting with {shipment.carrier}
                        </div>
                      </div>
                    </>
                  )}
                  {callStatus === 'view_platform' && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <div className="font-semibold text-green-900 dark:text-green-200">
                          Call Initiated
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          Carrier notification in progress
                        </div>
                      </div>
                      <button
                        onClick={handleViewPlatform}
                        className="px-4 py-2 bg-[#003366] dark:bg-[#4D7CA8] text-white rounded-lg hover:bg-[#002244] dark:hover:bg-[#3A5F85] transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        View on Platform →
                      </button>
                    </>
                  )}
                  {callStatus === 'failed' && (
                    <>
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <div>
                        <div className="font-semibold text-red-900 dark:text-red-200">
                          Call Failed
                        </div>
                        <div className="text-sm text-red-700 dark:text-red-300">
                          Please try again or contact manually
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action Button */}
            {!callInitiated && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleProceedToCall}
                  disabled={runsLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#003366] dark:bg-[#4D7CA8] text-white rounded-lg hover:bg-[#002244] dark:hover:bg-[#3A5F85] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Phone className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-semibold">Trigger Call</span>
                </button>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-3">
                  AI agent will contact carrier to discuss temperature deviation
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
