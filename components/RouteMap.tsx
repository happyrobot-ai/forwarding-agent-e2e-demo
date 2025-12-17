"use client";

import { useEffect, useState } from "react";
import { Truck, MapPin, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteMapProps {
  showReroute: boolean;
}

export function RouteMap({ showReroute }: RouteMapProps) {
  const [animateRoute, setAnimateRoute] = useState(false);

  useEffect(() => {
    if (showReroute) {
      setAnimateRoute(true);
    }
  }, [showReroute]);

  return (
    <div className="relative w-full h-[500px] bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      {/* Map Background (Simulated) */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
        {/* Grid pattern to simulate map */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-gray-400 dark:text-gray-600"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* SVG for Route Lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#3B82F6"
              className="dark:fill-blue-400"
            />
          </marker>
        </defs>

        {/* Original Route: Point A (Warehouse) to Point B (Destination) */}
        {!animateRoute && (
          <path
            d="M 100 400 L 500 100"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeDasharray="10,5"
            fill="none"
            markerEnd="url(#arrowhead)"
            className="opacity-50"
          />
        )}

        {/* Rerouted Path: A → C (Supplier) → B */}
        {animateRoute && (
          <>
            {/* A to C */}
            <path
              d="M 100 400 L 300 250"
              stroke="#3B82F6"
              strokeWidth="4"
              fill="none"
              markerEnd="url(#arrowhead)"
              className="dark:stroke-blue-400"
              strokeDasharray="1000"
              strokeDashoffset="1000"
              style={{
                animation: "drawPath 2s ease-out forwards",
              }}
            />
            {/* C to B */}
            <path
              d="M 300 250 L 500 100"
              stroke="#3B82F6"
              strokeWidth="4"
              fill="none"
              markerEnd="url(#arrowhead)"
              className="dark:stroke-blue-400"
              strokeDasharray="1000"
              strokeDashoffset="1000"
              style={{
                animation: "drawPath 2s ease-out 2s forwards",
              }}
            />
          </>
        )}
      </svg>

      {/* Point A: Warehouse */}
      <div
        className="absolute"
        style={{ left: "80px", top: "380px", zIndex: 2 }}
      >
        <div className="relative">
          <div className="bg-blue-600 dark:bg-blue-500 rounded-full p-3 shadow-lg">
            <Building className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-md border border-gray-200 dark:border-white/10">
              DFW Warehouse
            </div>
          </div>
        </div>
      </div>

      {/* Point C: Supplier (appears when reroute happens) */}
      {animateRoute && (
        <div
          className="absolute animate-fadeIn"
          style={{ left: "280px", top: "230px", zIndex: 2 }}
        >
          <div className="relative">
            <div className="bg-green-600 dark:bg-green-500 rounded-full p-3 shadow-lg animate-pulse">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-md border border-green-500">
                Texas Quality Meats
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Point B: Destination */}
      <div
        className="absolute"
        style={{ left: "480px", top: "80px", zIndex: 2 }}
      >
        <div className="relative">
          <div className="bg-purple-600 dark:bg-purple-500 rounded-full p-3 shadow-lg">
            <Building className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-md border border-gray-200 dark:border-white/10">
              Customer Delivery
            </div>
          </div>
        </div>
      </div>

      {/* Truck Icon (animates along route) */}
      {animateRoute && (
        <div
          className="absolute transition-all duration-2000 ease-linear"
          style={{
            left: "300px",
            top: "250px",
            zIndex: 3,
          }}
        >
          <div className="bg-yellow-500 rounded-full p-2 shadow-xl animate-bounce">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-yellow-500 px-2 py-0.5 rounded text-xs font-bold text-white shadow-md">
              Truck #882
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-white/10 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-gray-400 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Original Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-600 dark:bg-blue-400 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Rerouted</span>
        </div>
      </div>

      {/* Status Banner */}
      {animateRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-semibold text-sm animate-fadeIn">
          Route Updated - Driver Marcus Rerouted
        </div>
      )}
    </div>
  );
}
