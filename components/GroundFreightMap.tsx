"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

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

interface Coordinates {
  lat: number;
  lng: number;
}

interface MapShipment {
  shipmentId: string;
  status: string;
  alertType?: string;
  alertSeverity?: string;
  temperatureControlled: boolean;
  equipment: string;
  route: {
    origin: {
      city: string;
      state: string;
      coordinates: Coordinates;
    };
    destination: {
      city: string;
      state: string;
      coordinates: Coordinates;
    };
  };
  currentPosition?: {
    coordinates: Coordinates;
    location: string;
  };
  progress: number;
}

interface GroundFreightMapProps {
  shipments: GroundShipment[];
  onShipmentClick?: (shipmentId: string) => void;
  highlightedShipmentId?: string | null;
}

// US City coordinates for ground freight
const US_CITY_COORDS: Record<string, Coordinates> = {
  // West Coast
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
  'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
  'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
  'Portland, OR': { lat: 45.5051, lng: -122.6750 },
  'San Diego, CA': { lat: 32.7157, lng: -117.1611 },
  'Phoenix, AZ': { lat: 33.4484, lng: -112.0740 },
  'Las Vegas, NV': { lat: 36.1699, lng: -115.1398 },
  'Scottsdale, AZ': { lat: 33.4942, lng: -111.9261 },
  
  // Texas & Southwest
  'Dallas, TX': { lat: 32.7767, lng: -96.7970 },
  'Houston, TX': { lat: 29.7604, lng: -95.3698 },
  'San Antonio, TX': { lat: 29.4241, lng: -98.4936 },
  'Austin, TX': { lat: 30.2672, lng: -97.7431 },
  'El Paso, TX': { lat: 31.7619, lng: -106.4850 },
  'Denver, CO': { lat: 39.7392, lng: -104.9903 },
  'Albuquerque, NM': { lat: 35.0844, lng: -106.6504 },
  
  // Midwest
  'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
  'Detroit, MI': { lat: 42.3314, lng: -83.0458 },
  'Minneapolis, MN': { lat: 44.9778, lng: -93.2650 },
  'Indianapolis, IN': { lat: 39.7684, lng: -86.1581 },
  'Columbus, OH': { lat: 39.9612, lng: -82.9988 },
  'Kansas City, MO': { lat: 39.0997, lng: -94.5786 },
  'St. Louis, MO': { lat: 38.6270, lng: -90.1994 },
  'Milwaukee, WI': { lat: 43.0389, lng: -87.9065 },
  'Peoria, IL': { lat: 40.6936, lng: -89.5890 },
  
  // Southeast
  'Miami, FL': { lat: 25.7617, lng: -80.1918 },
  'Atlanta, GA': { lat: 33.7490, lng: -84.3880 },
  'Nashville, TN': { lat: 36.1627, lng: -86.7816 },
  'Charlotte, NC': { lat: 35.2271, lng: -80.8431 },
  'Memphis, TN': { lat: 35.1495, lng: -90.0490 },
  'New Orleans, LA': { lat: 29.9511, lng: -90.0715 },
  'Jacksonville, FL': { lat: 30.3322, lng: -81.6557 },
  'Tampa, FL': { lat: 27.9506, lng: -82.4572 },
  'Orlando, FL': { lat: 28.5383, lng: -81.3792 },
  'Palm Beach, FL': { lat: 26.7056, lng: -80.0364 },
  'Springdale, AR': { lat: 36.1867, lng: -94.1288 },
  
  // Northeast
  'New York, NY': { lat: 40.7128, lng: -74.0060 },
  'Boston, MA': { lat: 42.3601, lng: -71.0589 },
  'Philadelphia, PA': { lat: 39.9526, lng: -75.1652 },
  'Baltimore, MD': { lat: 39.2904, lng: -76.6122 },
  'Washington, DC': { lat: 38.9072, lng: -77.0369 },
  'Pittsburgh, PA': { lat: 40.4406, lng: -79.9959 },
  'Newark, NJ': { lat: 40.7357, lng: -74.1724 },
  'Jersey City, NJ': { lat: 40.7282, lng: -74.0776 },
  
  // Distribution hubs
  'Bentonville, AR': { lat: 36.3729, lng: -94.2088 },
};

// Get city key from city and state
function getCityKey(city: string, state: string): string {
  return `${city}, ${state}`;
}

export function GroundFreightMap({
  shipments,
  onShipmentClick,
  highlightedShipmentId,
}: GroundFreightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Convert shipments to map format
  const mapShipments: MapShipment[] = useMemo(() => {
    return shipments.map(s => {
      const originKey = getCityKey(s.originCity, s.originState);
      const destKey = getCityKey(s.destinationCity, s.destinationState);
      
      return {
        shipmentId: s.shipmentId,
        status: s.status,
        alertType: s.alertType,
        alertSeverity: s.alertSeverity,
        temperatureControlled: s.temperatureControlled,
        equipment: s.equipment,
        route: {
          origin: {
            city: s.originCity,
            state: s.originState,
            coordinates: US_CITY_COORDS[originKey] || { lat: 39.8283, lng: -98.5795 },
          },
          destination: {
            city: s.destinationCity,
            state: s.destinationState,
            coordinates: US_CITY_COORDS[destKey] || { lat: 39.8283, lng: -98.5795 },
          },
        },
        currentPosition: s.currentLat && s.currentLng ? {
          coordinates: { lat: s.currentLat, lng: s.currentLng },
          location: s.currentLocation || s.status,
        } : undefined,
        progress: s.progress,
      };
    });
  }, [shipments]);

  // Initialize map with US focus
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98.5795, 39.8283], // Geographic center of US
      zoom: 3.5,
      pitch: 45, // 3D perspective
      bearing: 0,
      projection: { name: "mercator" } as any,
    });

    map.on("load", () => {
      // Add 3D terrain and building layers for depth
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        maxzoom: 14
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      
      // Add atmosphere/sky for 3D effect
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.08,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.4,
      });
      
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update shipment markers and routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove existing route layers and alert layers
    mapShipments.forEach(({ shipmentId }) => {
      if (map.getLayer(`route-${shipmentId}`)) {
        map.removeLayer(`route-${shipmentId}`);
      }
      if (map.getSource(`route-${shipmentId}`)) {
        map.removeSource(`route-${shipmentId}`);
      }
      if (map.getLayer(`alert-icon-${shipmentId}`)) {
        map.removeLayer(`alert-icon-${shipmentId}`);
      }
      if (map.getLayer(`alert-layer-${shipmentId}`)) {
        map.removeLayer(`alert-layer-${shipmentId}`);
      }
      if (map.getLayer(`alert-pulse-${shipmentId}`)) {
        map.removeLayer(`alert-pulse-${shipmentId}`);
      }
      if (map.getSource(`alert-${shipmentId}`)) {
        map.removeSource(`alert-${shipmentId}`);
      }
    });

    // Add routes and markers
    mapShipments.forEach((shipment) => {
      const { origin, destination } = shipment.route;

      const start: [number, number] = [origin.coordinates.lng, origin.coordinates.lat];
      const end: [number, number] = [destination.coordinates.lng, destination.coordinates.lat];

      // Add route line (highway-style)
      map.addSource(`route-${shipment.shipmentId}`, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [start, end],
          },
        },
      });

      const isAlert = shipment.status === 'ALERT';
      const isHighlighted = shipment.shipmentId === highlightedShipmentId;
      const isReefer = shipment.temperatureControlled;

      // Route line color based on equipment/status
      let lineColor = "#60A5FA"; // Default blue
      if (isAlert) lineColor = "#DC2626"; // Red for alerts
      else if (isHighlighted) lineColor = "#003366"; // CEVA blue
      else if (isReefer) lineColor = "#22C55E"; // Green for reefer

      map.addLayer({
        id: `route-${shipment.shipmentId}`,
        type: "line",
        source: `route-${shipment.shipmentId}`,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": lineColor,
          "line-width": isHighlighted ? 4 : isAlert ? 3 : 2,
          "line-opacity": isHighlighted ? 1 : 0.8,
          "line-dasharray": isReefer ? [2, 1] : [1],
        },
      });

      // Add origin marker (warehouse/distribution center style)
      const originEl = document.createElement("div");
      originEl.className = "w-4 h-4 bg-[#003366] rounded border-2 border-white shadow-lg";
      originEl.style.transform = "rotate(45deg)";
      const originMarker = new mapboxgl.Marker(originEl)
        .setLngLat(start)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="text-xs"><strong>Origin</strong><br/>${origin.city}, ${origin.state}</div>`
          )
        )
        .addTo(map);
      markersRef.current.push(originMarker);

      // Add destination marker
      if (!isAlert) {
        const destEl = document.createElement("div");
        destEl.className = "w-4 h-4 bg-[#4D7CA8] rounded border-2 border-white shadow-lg";
        destEl.style.transform = "rotate(45deg)";
        const destMarker = new mapboxgl.Marker(destEl)
          .setLngLat(end)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="text-xs"><strong>Destination</strong><br/>${destination.city}, ${destination.state}</div>`
            )
          )
          .addTo(map);
        markersRef.current.push(destMarker);
      }

      // Calculate current truck position
      const hasArrived = ['ALERT', 'DELIVERED', 'AT_DESTINATION'].includes(shipment.status);
      const currentPos = hasArrived
        ? destination.coordinates
        : (shipment.currentPosition?.coordinates || {
            lat: origin.coordinates.lat + (destination.coordinates.lat - origin.coordinates.lat) * (shipment.progress / 100),
            lng: origin.coordinates.lng + (destination.coordinates.lng - origin.coordinates.lng) * (shipment.progress / 100),
          });

      // Truck icon SVG
      const truckSvg = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="${isAlert ? '#DC2626' : isHighlighted ? '#003366' : isReefer ? '#22C55E' : '#60A5FA'}" stroke="white" stroke-width="0.5" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      `;

      const shipmentEl = document.createElement("div");
      shipmentEl.className = cn(
        "relative cursor-pointer",
        isHighlighted && "scale-125"
      );
      shipmentEl.style.transition = "transform 0.2s ease-in-out";
      shipmentEl.innerHTML = `
        <div class="relative">
          ${isAlert ? `
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></div>
          ` : ''}
          ${truckSvg}
        </div>
      `;

      shipmentEl.addEventListener('mouseenter', () => {
        if (!isHighlighted) shipmentEl.style.transform = 'scale(1.15)';
      });
      shipmentEl.addEventListener('mouseleave', () => {
        if (!isHighlighted) shipmentEl.style.transform = 'scale(1)';
      });

      shipmentEl.onclick = () => {
        if (onShipmentClick) {
          onShipmentClick(shipment.shipmentId);
          map.flyTo({
            center: [currentPos.lng, currentPos.lat],
            zoom: 6,
            duration: 1500,
            essential: true
          });
        }
      };

      const markerPos: [number, number] = [currentPos.lng, currentPos.lat];

      if (isAlert) {
        // Add alert point as GeoJSON source + layers
        const alertSourceId = `alert-${shipment.shipmentId}`;
        const alertLayerId = `alert-layer-${shipment.shipmentId}`;
        const alertPulseLayerId = `alert-pulse-${shipment.shipmentId}`;

        map.addSource(alertSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { shipmentId: shipment.shipmentId },
            geometry: {
              type: 'Point',
              coordinates: end
            }
          }
        });

        map.addLayer({
          id: alertPulseLayerId,
          type: 'circle',
          source: alertSourceId,
          paint: {
            'circle-radius': 30,
            'circle-color': '#DC2626',
            'circle-opacity': 0.3,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#DC2626',
          }
        });

        map.addLayer({
          id: alertLayerId,
          type: 'circle',
          source: alertSourceId,
          paint: {
            'circle-radius': 16,
            'circle-color': '#DC2626',
            'circle-opacity': 1,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          }
        });

        // Add click handler for alert layers
        [alertLayerId].forEach(layerId => {
          map.on('click', layerId, () => {
            if (onShipmentClick) {
              onShipmentClick(shipment.shipmentId);
              map.flyTo({ center: end, zoom: 6, duration: 1500 });
            }
          });
          map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
        });

        // Still add truck marker for alert shipments
        const alertTruckMarker = new mapboxgl.Marker({ element: shipmentEl, anchor: 'center' })
          .setLngLat(end)
          .addTo(map);
        markersRef.current.push(alertTruckMarker);
      } else {
        const shipmentMarker = new mapboxgl.Marker({ element: shipmentEl, anchor: 'center' })
          .setLngLat(markerPos)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="text-xs">
                <strong>${shipment.shipmentId}</strong><br/>
                ${shipment.equipment} • ${shipment.status}
              </div>`
            )
          )
          .addTo(map);

        markersRef.current.push(shipmentMarker);
      }
    });

    // Zoom behavior
    if (highlightedShipmentId) {
      const highlighted = mapShipments.find(s => s.shipmentId === highlightedShipmentId);
      if (highlighted) {
        const currentPos = highlighted.currentPosition?.coordinates || {
          lat: highlighted.route.origin.coordinates.lat +
               (highlighted.route.destination.coordinates.lat - highlighted.route.origin.coordinates.lat) *
               (highlighted.progress / 100),
          lng: highlighted.route.origin.coordinates.lng +
               (highlighted.route.destination.coordinates.lng - highlighted.route.origin.coordinates.lng) *
               (highlighted.progress / 100),
        };
        map.flyTo({
          center: [currentPos.lng, currentPos.lat],
          zoom: 6,
          duration: 1500,
          essential: true
        });
      }
    } else if (mapShipments.length > 0) {
      // Fit bounds to show all shipments within US
      const bounds = new mapboxgl.LngLatBounds();
      mapShipments.forEach(({ route }) => {
        bounds.extend([route.origin.coordinates.lng, route.origin.coordinates.lat]);
        bounds.extend([route.destination.coordinates.lng, route.destination.coordinates.lat]);
      });
      map.fitBounds(bounds, { padding: 80, maxZoom: 5 });
    }
  }, [mapShipments, highlightedShipmentId, onShipmentClick, mapLoaded]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
}
