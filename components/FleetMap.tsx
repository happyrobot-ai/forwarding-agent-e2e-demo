"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Truck as TruckIcon, Warehouse as WarehouseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { OrderDetailPanel } from "./OrderDetailPanel";

// Warehouse/Distribution Center type
interface Warehouse {
  id: string;
  name: string;
  type: string; // "BROADLINE_HUB" | "REGIONAL_HUB"
  address: string;
  lat: number;
  lng: number;
  status: string;
  description?: string | null;
}

// Truck type from Samsara fleet
interface TruckData {
  id: string;
  driverName: string;
  vehicleType: string;
  status: string;
}

// Order type with geospatial data
interface Order {
  id: string;
  itemName: string;
  description?: string | null;
  orderValue?: number;
  status: string;
  carrier: string;
  truckId?: string | null;
  truck?: TruckData | null; // Samsara truck info
  origin: string;
  destination: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  riskScore: number;
  routeGeoJson?: number[][] | null; // Precomputed route from Mapbox
  progress?: number; // 0-100, position along route
}

// View states
const WORLD_VIEW = { lat: 25.0, lng: -40.0, zoom: 1.8 }; // Far out world view for cinematic entry
const TEXAS_VIEW = { lat: 31.0, lng: -99.5, zoom: 5.5 }; // Default home view
const DALLAS_VIEW = { lat: 32.7767, lng: -96.7970, zoom: 10 };

// GeoJSON Layer Style for Routes - Data-driven styling (background routes, subtle)
const routeLayerStyle: LayerProps = {
  id: "routes",
  type: "line",
  paint: {
    // Dynamic color based on 'riskScore' property
    "line-color": [
      "interpolate",
      ["linear"],
      ["get", "riskScore"],
      0, "#10b981",   // Green (Score 0)
      40, "#f59e0b",  // Orange (Score 40)
      80, "#ef4444",  // Red (Score 80+)
    ],
    // Subtle width for background routes
    "line-width": 2,
    // Low opacity for background, selected routes shown on top
    "line-opacity": 0.25,
  },
};

// Highlighted route style (when truck is clicked)
const selectedRouteLayerStyle: LayerProps = {
  id: "selected-route",
  type: "line",
  paint: {
    "line-color": [
      "interpolate",
      ["linear"],
      ["get", "riskScore"],
      0, "#10b981",
      40, "#f59e0b",
      80, "#ef4444",
    ],
    "line-width": 4,
    "line-opacity": 1,
  },
};

interface FleetMapProps {
  orders?: Order[];
  warehouses?: Warehouse[];
  incidentStatus: "IDLE" | "ACTIVE" | "RESOLVED";
  incidentDescription?: string | null;
  onIncidentClick: () => void;
  affectedOrderId?: string | null;
  highlightedOrderId?: string | null; // External selection from table
  onOrderSelect?: (orderId: string | null) => void; // Callback when order is selected on map
  viewMode?: "dashboard" | "focused"; // "focused" for War Room with auto-fit bounds
  interactive?: boolean; // Whether map interactions are enabled
}

export function FleetMap({
  orders = [],
  warehouses = [],
  incidentStatus,
  incidentDescription,
  onIncidentClick,
  affectedOrderId,
  highlightedOrderId,
  onOrderSelect,
  viewMode = "dashboard",
  interactive = true
}: FleetMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hasPlayedInitialAnimation, setHasPlayedInitialAnimation] = useState(false);
  const prevIncidentStatusRef = useRef<string>(incidentStatus);
  const prevHighlightedOrderIdRef = useRef<string | null>(null);
  const hasFittedBoundsRef = useRef(false);

  const getSamsaraLogo = () => {
    return theme === "dark"
      ? "/samsara/Samsara_logo_primary_vertical_wht.png"
      : "/samsara/Samsara_logo_primary_vertical_blk.png";
  };

  // Map style based on theme
  const mapStyle = theme === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";

  // Dynamic route layer style based on viewMode
  const dynamicRouteStyle = useMemo((): LayerProps => ({
    id: "routes",
    type: "line",
    paint: {
      "line-color": [
        "interpolate",
        ["linear"],
        ["get", "riskScore"],
        0, "#10b981",
        40, "#f59e0b",
        80, "#ef4444",
      ],
      "line-width": viewMode === "focused" ? 5 : 2,
      "line-opacity": viewMode === "focused" ? 1 : 0.25,
    },
  }), [viewMode]);

  // Helper: Get position along route based on progress
  const getPositionAlongRoute = (route: number[][], progress: number): [number, number] => {
    if (!route || route.length === 0) return [0, 0];
    const index = Math.floor((progress / 100) * (route.length - 1));
    const safeIndex = Math.min(index, route.length - 1);
    return route[safeIndex] as [number, number];
  };

  // Convert orders to GeoJSON FeatureCollection using precomputed routes
  const geoJsonData = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: orders
        .filter(order =>
          // Filter out orders with missing or default (0) coordinates
          order.startLat != null && order.startLat !== 0 &&
          order.startLng != null && order.startLng !== 0 &&
          order.endLat != null && order.endLat !== 0 &&
          order.endLng != null && order.endLng !== 0
        )
        .map(order => {
          // Use precomputed route if available, otherwise fallback to straight line
          const coordinates = order.routeGeoJson && Array.isArray(order.routeGeoJson)
            ? order.routeGeoJson
            : [[order.startLng, order.startLat], [order.endLng, order.endLat]];

          return {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates,
            },
            properties: {
              riskScore: order.riskScore,
              id: order.id,
              status: order.status,
              isSelected: order.id === selectedOrderId,
            },
          };
        }),
    };
  }, [orders, selectedOrderId]);

  // Selected route for highlighting (when truck is clicked)
  const selectedRouteData = useMemo(() => {
    if (!selectedOrderId) return null;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return null;

    const coordinates = order.routeGeoJson && Array.isArray(order.routeGeoJson)
      ? order.routeGeoJson
      : [[order.startLng, order.startLat], [order.endLng, order.endLat]];

    return {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
        properties: {
          riskScore: order.riskScore,
        },
      }],
    };
  }, [selectedOrderId, orders]);

  // Helper: Interpolate position along straight line based on progress
  const getPositionAlongStraightLine = (
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
    progress: number
  ): [number, number] => {
    const t = progress / 100;
    return [
      startLng + (endLng - startLng) * t,
      startLat + (endLat - startLat) * t,
    ];
  };

  // Truck markers with positions along routes
  const truckMarkers = useMemo(() => {
    return orders
      .filter(order => {
        // Only show trucks for in-transit orders with assigned trucks
        if (order.status === "CONFIRMED") return false;
        if (!order.truck) return false; // Must have an assigned truck
        // Allow orders with routeGeoJson OR valid coordinates
        const hasRoute = order.routeGeoJson && Array.isArray(order.routeGeoJson) && order.routeGeoJson.length > 0;
        const hasValidCoords = order.startLat !== 0 && order.startLng !== 0 && order.endLat !== 0 && order.endLng !== 0;
        return hasRoute || hasValidCoords;
      })
      .map(order => {
        const progress = order.progress ?? 50;
        // Use route if available, otherwise interpolate along straight line
        let position: [number, number];
        if (order.routeGeoJson && Array.isArray(order.routeGeoJson) && order.routeGeoJson.length > 0) {
          position = getPositionAlongRoute(order.routeGeoJson, progress);
        } else {
          position = getPositionAlongStraightLine(
            order.startLng,
            order.startLat,
            order.endLng,
            order.endLat,
            progress
          );
        }
        return {
          orderId: order.id,
          truckId: order.truck!.id,
          driverName: order.truck!.driverName,
          vehicleType: order.truck!.vehicleType,
          lng: position[0],
          lat: position[1],
          riskScore: order.riskScore,
          status: order.status,
          origin: order.origin,
          destination: order.destination,
          itemName: order.itemName,
          carrier: order.carrier,
        };
      });
  }, [orders]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = orders.length;
    const nominal = orders.filter(o => o.riskScore < 40).length;
    const atRisk = orders.filter(o => o.riskScore >= 40 && o.riskScore < 80).length;
    const critical = orders.filter(o => o.riskScore >= 80).length;
    return { total, nominal, atRisk, critical };
  }, [orders]);

  // Cinematic "FlyTo" Effect - Dynamic based on affected order
  useEffect(() => {
    // Skip this effect during initial cinematic animation
    if (!isMapLoaded || !mapRef.current || !hasPlayedInitialAnimation) return;

    const prevStatus = prevIncidentStatusRef.current;
    prevIncidentStatusRef.current = incidentStatus;

    if (incidentStatus === "ACTIVE") {
      // Find the affected order to zoom to its location
      const affectedOrder = affectedOrderId
        ? orders.find(o => o.id === affectedOrderId)
        : orders.find(o => o.riskScore >= 80);

      if (affectedOrder) {
        // Calculate truck's current position along the route
        let targetLng = affectedOrder.endLng;
        let targetLat = affectedOrder.endLat;

        // If the order has a route and progress, calculate the truck's position
        if (affectedOrder.routeGeoJson && Array.isArray(affectedOrder.routeGeoJson) && affectedOrder.routeGeoJson.length > 0) {
          const progress = affectedOrder.progress ?? 50;
          const position = getPositionAlongRoute(affectedOrder.routeGeoJson, progress);
          targetLng = position[0];
          targetLat = position[1];
        }

        // Dramatic zoom to the truck's current location (doubled duration: 5000ms)
        mapRef.current.flyTo({
          center: [targetLng, targetLat],
          zoom: 10,
          duration: 5000,
          essential: true,
        });
      } else {
        // Fallback to Dallas if no affected order found
        mapRef.current.flyTo({
          center: [DALLAS_VIEW.lng, DALLAS_VIEW.lat],
          zoom: DALLAS_VIEW.zoom,
          duration: 5000,
          essential: true,
        });
      }
    } else if ((incidentStatus === "RESOLVED" || incidentStatus === "IDLE") && prevStatus === "ACTIVE") {
      // Only flyTo Texas when resetting from an active incident (not on initial load)
      mapRef.current.flyTo({
        center: [TEXAS_VIEW.lng, TEXAS_VIEW.lat],
        zoom: TEXAS_VIEW.zoom,
        duration: 4000,
        essential: true,
      });
    }
  }, [incidentStatus, isMapLoaded, affectedOrderId, orders, hasPlayedInitialAnimation]);

  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true);
  }, []);

  // Cinematic initial zoom: World view → Texas view on first load (dashboard mode only)
  useEffect(() => {
    if (viewMode === "focused") return; // Skip cinematic animation for focused mode
    if (!isMapLoaded || !mapRef.current || hasPlayedInitialAnimation) return;

    // Small delay to ensure map is fully ready, then start cinematic zoom
    const timer = setTimeout(() => {
      mapRef.current?.flyTo({
        center: [TEXAS_VIEW.lng, TEXAS_VIEW.lat],
        zoom: TEXAS_VIEW.zoom,
        duration: 10000, // 10 seconds for super slow cinematic effect
        essential: true,
        curve: 0.5, // Lower curve = more constant speed throughout (less acceleration/deceleration)
        easing: (t: number) => t, // Linear easing for perfectly fluid motion
      });
      setHasPlayedInitialAnimation(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isMapLoaded, hasPlayedInitialAnimation, viewMode]);

  // Focused mode: Auto-fit bounds to show all orders (used in War Room)
  useEffect(() => {
    if (viewMode !== "focused" || !isMapLoaded || !mapRef.current || hasFittedBoundsRef.current) return;
    if (orders.length === 0) return;

    const map = mapRef.current.getMap();

    // Collect all coordinates to find center and bounds
    const allCoords: [number, number][] = [];

    orders.forEach(order => {
      if (order.routeGeoJson && Array.isArray(order.routeGeoJson)) {
        order.routeGeoJson.forEach(coord => {
          allCoords.push([coord[0], coord[1]]);
        });
      } else if (
        order.startLat != null && order.startLat !== 0 &&
        order.startLng != null && order.startLng !== 0 &&
        order.endLat != null && order.endLat !== 0 &&
        order.endLng != null && order.endLng !== 0
      ) {
        allCoords.push([order.startLng, order.startLat]);
        allCoords.push([order.endLng, order.endLat]);
      }
    });

    if (allCoords.length > 0) {
      // Calculate center point of all coordinates
      const sumLng = allCoords.reduce((sum, c) => sum + c[0], 0);
      const sumLat = allCoords.reduce((sum, c) => sum + c[1], 0);
      const centerLng = sumLng / allCoords.length;
      const centerLat = sumLat / allCoords.length;

      // Calculate the span to determine zoom level
      const minLng = Math.min(...allCoords.map(c => c[0]));
      const maxLng = Math.max(...allCoords.map(c => c[0]));
      const minLat = Math.min(...allCoords.map(c => c[1]));
      const maxLat = Math.max(...allCoords.map(c => c[1]));
      const lngSpan = maxLng - minLng;
      const latSpan = maxLat - minLat;
      const maxSpan = Math.max(lngSpan, latSpan);

      // Calculate zoom based on span (rough approximation)
      // Larger span = lower zoom
      let zoom = 7;
      if (maxSpan > 10) zoom = 4;
      else if (maxSpan > 5) zoom = 5;
      else if (maxSpan > 2) zoom = 6;
      else if (maxSpan > 1) zoom = 7;
      else zoom = 8;

      // Trigger resize and then fly to center
      map.resize();

      setTimeout(() => {
        map.flyTo({
          center: [centerLng, centerLat],
          zoom: zoom,
          duration: 800,
          essential: true,
        });
      }, 150);

      hasFittedBoundsRef.current = true;
      setHasPlayedInitialAnimation(true);
    }
  }, [viewMode, isMapLoaded, orders]);

  // Handle external order selection (from table click) - fly to the order
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !hasPlayedInitialAnimation) return;
    if (highlightedOrderId === prevHighlightedOrderIdRef.current) return;

    prevHighlightedOrderIdRef.current = highlightedOrderId ?? null;

    if (highlightedOrderId) {
      const order = orders.find(o => o.id === highlightedOrderId);
      if (order) {
        // Update internal selected state
        setSelectedOrderId(highlightedOrderId);

        // Calculate truck position if it has a route
        let targetLng = order.endLng;
        let targetLat = order.endLat;

        if (order.routeGeoJson && Array.isArray(order.routeGeoJson) && order.routeGeoJson.length > 0) {
          const progress = order.progress ?? 50;
          const position = getPositionAlongRoute(order.routeGeoJson, progress);
          targetLng = position[0];
          targetLat = position[1];
        }

        // Fly to the order location
        mapRef.current.flyTo({
          center: [targetLng, targetLat],
          zoom: 9,
          duration: 2000,
          essential: true,
        });
      }
    } else {
      // If selection cleared, zoom back out to Texas view
      setSelectedOrderId(null);
      mapRef.current.flyTo({
        center: [TEXAS_VIEW.lng, TEXAS_VIEW.lat],
        zoom: TEXAS_VIEW.zoom,
        duration: 2000,
        essential: true,
      });
    }
  }, [highlightedOrderId, orders, isMapLoaded, hasPlayedInitialAnimation]);

  // Handle internal map marker clicks - show order details panel
  const handleMarkerClick = useCallback((orderId: string, _riskScore: number, lng: number, lat: number) => {
    const newSelection = selectedOrderId === orderId ? null : orderId;
    setSelectedOrderId(newSelection);
    onOrderSelect?.(newSelection);

    // Fly to marker when selecting
    if (newSelection && mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 10,
        duration: 2000,
        essential: true,
      });
    }
  }, [selectedOrderId, onOrderSelect]);

  return (
    <div className={cn(
      "h-full w-full overflow-hidden rounded-xl border shadow-lg relative",
      "bg-[var(--sysco-card)] border-[var(--sysco-border)]"
    )}>
      <Map
        ref={mapRef}
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: viewMode === "focused" ? TEXAS_VIEW.lng : WORLD_VIEW.lng,
          latitude: viewMode === "focused" ? TEXAS_VIEW.lat : WORLD_VIEW.lat,
          zoom: viewMode === "focused" ? TEXAS_VIEW.zoom : WORLD_VIEW.zoom,
        }}
        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        attributionControl={false}
        reuseMaps
        scrollZoom={interactive}
        dragPan={interactive}
        dragRotate={interactive}
        doubleClickZoom={interactive}
        touchZoomRotate={interactive}
      >
        {/* GeoJSON Route Lines (background in dashboard, prominent in focused) */}
        <Source id="sysco-routes" type="geojson" data={geoJsonData}>
          <Layer {...dynamicRouteStyle} />
        </Source>

        {/* Highlighted Selected Route */}
        {selectedRouteData && (
          <Source id="selected-route" type="geojson" data={selectedRouteData}>
            <Layer {...selectedRouteLayerStyle} />
          </Source>
        )}

        {/* Truck Markers along routes */}
        {truckMarkers.map(truck => {
          const isSelected = truck.orderId === selectedOrderId;
          const isHighRisk = truck.riskScore >= 80;
          const isMediumRisk = truck.riskScore >= 40;

          return (
            <Marker
              key={truck.orderId}
              longitude={truck.lng}
              latitude={truck.lat}
              onClick={() => handleMarkerClick(truck.orderId, truck.riskScore, truck.lng, truck.lat)}
            >
              <div className="relative group cursor-pointer">
                {/* Radar ping effect for critical trucks */}
                {isHighRisk && (
                  <>
                    {/* Radar ring 1 - slowest, largest */}
                    <div
                      className="absolute rounded-full border-2 border-red-500 pointer-events-none"
                      style={{
                        width: '60px',
                        height: '60px',
                        top: '-18px',  /* Center on 24px truck: -(60-24)/2 */
                        left: '-18px',
                        animation: 'radar-ping 3s ease-out infinite',
                      }}
                    />
                    {/* Radar ring 2 - medium speed */}
                    <div
                      className="absolute rounded-full border-2 border-red-500 pointer-events-none"
                      style={{
                        width: '60px',
                        height: '60px',
                        top: '-18px',
                        left: '-18px',
                        animation: 'radar-ping 3s ease-out infinite 1s',
                      }}
                    />
                    {/* Radar ring 3 - fastest, starts earliest */}
                    <div
                      className="absolute rounded-full border-2 border-red-500 pointer-events-none"
                      style={{
                        width: '60px',
                        height: '60px',
                        top: '-18px',
                        left: '-18px',
                        animation: 'radar-ping 3s ease-out infinite 2s',
                      }}
                    />
                    {/* Glow effect behind truck */}
                    <div
                      className="absolute rounded-full bg-red-500/30 pointer-events-none"
                      style={{
                        width: '32px',
                        height: '32px',
                        top: '-4px',  /* Center on 24px truck: -(32-24)/2 */
                        left: '-4px',
                        animation: 'radar-glow 1.5s ease-in-out infinite',
                      }}
                    />
                  </>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <div className="absolute -top-2 -left-2 h-10 w-10 rounded-full border-2 border-blue-400 animate-pulse" />
                )}

                {/* Truck icon */}
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border shadow-lg transition-all",
                  isHighRisk
                    ? "bg-red-500 border-red-400 text-white"
                    : isMediumRisk
                      ? "bg-orange-500 border-orange-400 text-white"
                      : "bg-emerald-600 border-emerald-500 text-white",
                  isSelected && "scale-125 ring-2 ring-blue-400 ring-offset-1"
                )}>
                  <TruckIcon className="h-3 w-3" />
                </div>

                {/* Tooltip on hover - shows truck & driver info */}
                <div className={cn(
                  "absolute bottom-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50",
                  "whitespace-nowrap border px-2 py-1.5 text-xs font-mono rounded pointer-events-none",
                  "bg-black/90 border-zinc-700 text-white"
                )}>
                  <div className="font-semibold text-blue-400">{truck.truckId}</div>
                  <div className="text-white text-[11px]">{truck.driverName}</div>
                  <div className="text-zinc-500 text-[10px] border-t border-zinc-700 mt-1 pt-1">
                    {truck.origin} → {truck.destination}
                  </div>
                  <div className={cn(
                    "text-[10px]",
                    isHighRisk ? "text-red-400" : isMediumRisk ? "text-orange-400" : "text-emerald-400"
                  )}>
                    {truck.itemName}
                  </div>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Destination marker for selected route */}
        {selectedOrderId && (() => {
          const order = orders.find(o => o.id === selectedOrderId);
          if (!order) return null;
          return (
            <Marker longitude={order.endLng} latitude={order.endLat}>
              <div className="flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                  📍
                </div>
                <div className="mt-1 px-2 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded whitespace-nowrap">
                  {order.destination}
                </div>
              </div>
            </Marker>
          );
        })()}

        {/* Warehouse/Distribution Center Markers */}
        {warehouses.map(warehouse => {
          const isBroadline = warehouse.type === "BROADLINE_HUB";
          return (
            <Marker
              key={warehouse.id}
              longitude={warehouse.lng}
              latitude={warehouse.lat}
            >
              <div className="relative group cursor-pointer">
                {/* Warehouse icon */}
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-lg border-2 shadow-lg transition-all",
                  isBroadline
                    ? "bg-blue-600 border-blue-400 text-white"
                    : "bg-indigo-600 border-indigo-400 text-white",
                  "hover:scale-110"
                )}>
                  <WarehouseIcon className="h-2 w-2" />
                </div>

                {/* Tooltip on hover */}
                <div className={cn(
                  "absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50",
                  "whitespace-nowrap border px-3 py-2 text-xs font-mono rounded-lg pointer-events-none",
                  "bg-black/90 border-zinc-700 text-white min-w-[180px]"
                )}>
                  <div className="font-semibold text-blue-400">{warehouse.name}</div>
                  <div className="text-zinc-400 text-[10px] mt-1">{warehouse.id}</div>
                  <div className={cn(
                    "text-[10px] mt-1 px-1.5 py-0.5 rounded inline-block",
                    isBroadline ? "bg-blue-500/20 text-blue-300" : "bg-indigo-500/20 text-indigo-300"
                  )}>
                    {isBroadline ? "Broadline Hub" : "Regional Hub"}
                  </div>
                  {warehouse.description && (
                    <div className="text-zinc-500 text-[10px] mt-1 border-t border-zinc-700 pt-1">
                      {warehouse.description}
                    </div>
                  )}
                </div>
              </div>
            </Marker>
          );
        })}

      </Map>

      {/* Order Detail Panel - shows when order is selected (dashboard mode only) */}
      {viewMode === "dashboard" && selectedOrderId && (() => {
        const selectedOrder = orders.find(o => o.id === selectedOrderId);
        if (!selectedOrder) return null;
        return (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => {
              setSelectedOrderId(null);
              onOrderSelect?.(null);
            }}
            isIncidentActive={incidentStatus === "ACTIVE"}
            incidentDescription={incidentDescription}
            onOpenWarRoom={onIncidentClick}
          />
        );
      })()}

      {/* Overlay: Network Health Legend - hidden when order detail panel is open or in focused mode */}
      {viewMode === "dashboard" && !selectedOrderId && (
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className={cn(
          "backdrop-blur p-3 rounded-lg border text-xs font-mono",
          "bg-black/70 dark:bg-black/80 border-zinc-700"
        )}>
          <div className="text-zinc-400 mb-2 text-[10px] uppercase tracking-wider">Network Health</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
              <span className="text-zinc-500">Nominal</span>
              <span className="text-emerald-400 ml-auto">{stats.nominal}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-orange-500 rounded"></span>
              <span className="text-zinc-500">At Risk</span>
              <span className="text-orange-400 ml-auto">{stats.atRisk}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-red-500 rounded"></span>
              <span className="text-zinc-500">Critical</span>
              <span className="text-red-400 ml-auto">{stats.critical}</span>
            </div>
          </div>
          <div className="border-t border-zinc-700 mt-2 pt-2 flex items-center justify-between">
            <span className="text-zinc-500">ACTIVE_ROUTES:</span>
            <span className="text-zinc-300">{stats.total}</span>
          </div>
        </div>
      </div>
      )}

      {/* Overlay: Fleet Status (dashboard mode only) */}
      {viewMode === "dashboard" && (
      <div className="absolute bottom-4 right-4">
        <div className={cn(
          "backdrop-blur p-3 rounded-lg border text-xs font-mono",
          "bg-black/70 dark:bg-black/80 border-zinc-700"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              incidentStatus === "ACTIVE" ? "bg-red-500 animate-pulse" : "bg-emerald-500"
            )} />
            <span className="text-zinc-400">STATUS:</span>
            <span className={cn(
              "font-semibold",
              incidentStatus === "ACTIVE" ? "text-red-400" : "text-emerald-400"
            )}>
              {incidentStatus === "ACTIVE" ? "ALERT" : "NOMINAL"}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Overlay: Samsara Integration Badge (dashboard mode only) */}
      {viewMode === "dashboard" && (
      <div className="absolute top-4 right-4">
          <Image
            src={getSamsaraLogo()}
            alt="Samsara"
            width={40}
            height={20}
            className="object-contain animate-pulse"
          />
      </div>
      )}

      {/* Click hint when incident is active and no order selected (dashboard mode only) */}
      {viewMode === "dashboard" && incidentStatus === "ACTIVE" && !selectedOrderId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className={cn(
            "backdrop-blur px-4 py-2 rounded-lg border text-xs font-mono animate-pulse",
            "bg-red-900/80 border-red-700 text-red-100"
          )}>
            Click incident marker to see details
          </div>
        </div>
      )}

      {/* Subtle ambient glow for Texas cluster - only shown when no incident (dashboard mode only) */}
      {viewMode === "dashboard" && incidentStatus !== "ACTIVE" && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: '400px',
            height: '400px',
            top: '50%',
            left: '55%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.02) 40%, transparent 70%)',
            animation: 'cluster-glow 4s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}
