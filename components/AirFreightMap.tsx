"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

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
  currentLat?: number;
  currentLng?: number;
  progress: number;
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
  temperatureSensitive: boolean;
  route: {
    origin: {
      code: string;
      name: string;
      coordinates: Coordinates;
    };
    destination: {
      code: string;
      name: string;
      coordinates: Coordinates;
    };
  };
  currentPosition?: {
    coordinates: Coordinates;
    location: string;
  };
  progress: number;
}

interface AirFreightMapProps {
  shipments: Shipment[];
  onShipmentClick?: (shipmentId: string) => void;
  highlightedShipmentId?: string | null;
}

// Airport coordinates (major hubs)
const AIRPORT_COORDS: Record<string, Coordinates> = {
  // Europe
  'BSL': { lat: 47.5895, lng: 7.5298 },   // Basel
  'ZRH': { lat: 47.4647, lng: 8.5492 },   // Zurich
  'AMS': { lat: 52.3105, lng: 4.7683 },   // Amsterdam
  'FRA': { lat: 50.0379, lng: 8.5622 },   // Frankfurt
  'CPH': { lat: 55.6180, lng: 12.6508 },  // Copenhagen
  'CDG': { lat: 49.0097, lng: 2.5479 },   // Paris CDG
  'MXP': { lat: 45.6306, lng: 8.7281 },   // Milan
  'LHR': { lat: 51.4700, lng: -0.4543 },  // London Heathrow
  'GVA': { lat: 46.2381, lng: 6.1089 },   // Geneva
  'BRU': { lat: 50.9014, lng: 4.4844 },   // Brussels
  'MAD': { lat: 40.4983, lng: -3.5676 },  // Madrid
  'VIE': { lat: 48.1103, lng: 16.5697 },  // Vienna
  'DUS': { lat: 51.2895, lng: 6.7668 },   // Dusseldorf
  'MUC': { lat: 48.3537, lng: 11.7750 },  // Munich
  'DUB': { lat: 53.4264, lng: -6.2499 },  // Dublin
  'FCO': { lat: 41.8003, lng: 12.2389 },  // Rome
  'ZAG': { lat: 45.7429, lng: 16.0688 },  // Zagreb
  'LIS': { lat: 38.7756, lng: -9.1354 },  // Lisbon
  'WAW': { lat: 52.1657, lng: 20.9671 },  // Warsaw
  'PRG': { lat: 50.1008, lng: 14.2600 },  // Prague
  'STN': { lat: 51.8850, lng: 0.2350 },   // London Stansted
  'HEL': { lat: 60.3172, lng: 24.9633 },  // Helsinki
  'OSL': { lat: 60.1939, lng: 11.1004 },  // Oslo
  'ARN': { lat: 59.6519, lng: 17.9186 },  // Stockholm
  'BUD': { lat: 47.4298, lng: 19.2611 },  // Budapest
  // Asia Pacific
  'SIN': { lat: 1.3644, lng: 103.9915 },  // Singapore
  'PVG': { lat: 31.1443, lng: 121.8083 }, // Shanghai
  'NRT': { lat: 35.7647, lng: 140.3864 }, // Tokyo Narita
  'HKG': { lat: 22.3080, lng: 113.9185 }, // Hong Kong
  'ICN': { lat: 37.4602, lng: 126.4407 }, // Seoul Incheon
  'PEK': { lat: 40.0799, lng: 116.6031 }, // Beijing
  'MEL': { lat: -37.6690, lng: 144.8410 }, // Melbourne
  'BKK': { lat: 13.6900, lng: 100.7501 }, // Bangkok
  'KUL': { lat: 2.7456, lng: 101.7072 },  // Kuala Lumpur
  'CGK': { lat: -6.1256, lng: 106.6559 }, // Jakarta
  'BOM': { lat: 19.0896, lng: 72.8656 },  // Mumbai
  'DEL': { lat: 28.5562, lng: 77.1000 },  // Delhi
  // Middle East & Africa
  'DXB': { lat: 25.2532, lng: 55.3657 },  // Dubai
  'DOH': { lat: 25.2609, lng: 51.6138 },  // Doha
  'TLV': { lat: 32.0055, lng: 34.8854 },  // Tel Aviv
  'JNB': { lat: -26.1392, lng: 28.2460 }, // Johannesburg
  'CPT': { lat: -33.9715, lng: 18.6021 }, // Cape Town
  // Americas
  'JFK': { lat: 40.6413, lng: -73.7781 }, // New York JFK
  'LAX': { lat: 33.9416, lng: -118.4085 }, // Los Angeles
  'ORD': { lat: 41.9742, lng: -87.9073 }, // Chicago
  'BOS': { lat: 42.3656, lng: -71.0096 }, // Boston
  'MEX': { lat: 19.4361, lng: -99.0719 }, // Mexico City
  'MIA': { lat: 25.7959, lng: -80.2870 }, // Miami
  'GRU': { lat: -23.4356, lng: -46.4731 }, // Sao Paulo
  'SFO': { lat: 37.6213, lng: -122.3790 }, // San Francisco
  'ATL': { lat: 33.6407, lng: -84.4277 }, // Atlanta
  'SEA': { lat: 47.4502, lng: -122.3088 }, // Seattle
  'EWR': { lat: 40.6895, lng: -74.1745 }, // Newark
  'DFW': { lat: 32.8998, lng: -97.0403 }, // Dallas
  'YYZ': { lat: 43.6777, lng: -79.6248 }, // Toronto
  'PHX': { lat: 33.4373, lng: -112.0078 }, // Phoenix
  'GIG': { lat: -22.8090, lng: -43.2506 }, // Rio de Janeiro
};

export function AirFreightMap({
  shipments,
  onShipmentClick,
  highlightedShipmentId,
}: AirFreightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Convert shipments to map format
  const mapShipments: MapShipment[] = useMemo(() => {
    return shipments.map(s => ({
      shipmentId: s.shipmentId,
      status: s.status,
      alertType: s.alertType,
      alertSeverity: s.alertSeverity,
      temperatureSensitive: s.temperatureSensitive,
      route: {
        origin: {
          code: s.originCode,
          name: s.originName,
          coordinates: AIRPORT_COORDS[s.originCode] || { lat: 0, lng: 0 },
        },
        destination: {
          code: s.destinationCode,
          name: s.destinationName,
          coordinates: AIRPORT_COORDS[s.destinationCode] || { lat: 0, lng: 0 },
        },
      },
      currentPosition: s.currentLat && s.currentLng ? {
        coordinates: { lat: s.currentLat, lng: s.currentLng },
        location: s.status,
      } : undefined,
      progress: s.progress,
    }));
  }, [shipments]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [15, 50], // Europe view
      zoom: 3,
      projection: { name: "globe" } as any,
    });

    map.on("load", () => {
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6,
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
      // Remove route
      if (map.getLayer(`route-${shipmentId}`)) {
        map.removeLayer(`route-${shipmentId}`);
      }
      if (map.getSource(`route-${shipmentId}`)) {
        map.removeSource(`route-${shipmentId}`);
      }
      // Remove alert layers
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

      // Create great circle arc for flight path
      const start = [origin.coordinates.lng, origin.coordinates.lat];
      const end = [destination.coordinates.lng, destination.coordinates.lat];

      // Debug ALL shipments
      console.log('SHIPMENT:', shipment.shipmentId, {
        status: shipment.status,
        originCode: origin.code,
        destCode: destination.code,
        destCoords: destination.coordinates,
        end,
      });

      // Add route line
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

      map.addLayer({
        id: `route-${shipment.shipmentId}`,
        type: "line",
        source: `route-${shipment.shipmentId}`,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": isAlert ? "#DC2626" : isHighlighted ? "#003366" : "#60A5FA",
          "line-width": isHighlighted ? 3 : isAlert ? 2.5 : 1.5,
          "line-opacity": isHighlighted ? 1 : 0.7,
        },
      });

      // Add origin marker
      const originEl = document.createElement("div");
      originEl.className = "w-3 h-3 bg-[#003366] rounded-full border-2 border-white shadow-lg";
      const originMarker = new mapboxgl.Marker(originEl)
        .setLngLat(start as [number, number])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="text-xs"><strong>${origin.code}</strong><br/>${origin.name}</div>`
          )
        )
        .addTo(map);
      markersRef.current.push(originMarker);

      // Add destination marker (skip for alert shipments - alert marker replaces it)
      if (!isAlert) {
        const destEl = document.createElement("div");
        destEl.className = "w-3 h-3 bg-[#003366] rounded-full border-2 border-white shadow-lg";
        const destMarker = new mapboxgl.Marker(destEl)
          .setLngLat(end as [number, number])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="text-xs"><strong>${destination.code}</strong><br/>${destination.name}</div>`
            )
          )
          .addTo(map);
        markersRef.current.push(destMarker);
      }

      // Add shipment marker (plane icon)
      // For arrived shipments (ALERT, DELIVERED, CUSTOMS_HOLD, ARRIVED), always show at destination
      const hasArrived = ['ALERT', 'DELIVERED', 'CUSTOMS_HOLD', 'ARRIVED'].includes(shipment.status);
      const currentPos = hasArrived
        ? destination.coordinates  // Always use destination for arrived shipments
        : (shipment.currentPosition?.coordinates || {
            // Interpolate position based on progress for in-flight shipments
            lat: origin.coordinates.lat + (destination.coordinates.lat - origin.coordinates.lat) * (shipment.progress / 100),
            lng: origin.coordinates.lng + (destination.coordinates.lng - origin.coordinates.lng) * (shipment.progress / 100),
          });

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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="${isAlert ? '#DC2626' : isHighlighted ? '#003366' : '#60A5FA'}" stroke="white" stroke-width="0.5" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); pointer-events: none;">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      `;

      // Add hover effect via JavaScript to avoid glitches
      shipmentEl.addEventListener('mouseenter', () => {
        if (!isHighlighted) {
          shipmentEl.style.transform = 'scale(1.15)';
        }
      });
      shipmentEl.addEventListener('mouseleave', () => {
        if (!isHighlighted) {
          shipmentEl.style.transform = 'scale(1)';
        }
      });

      shipmentEl.onclick = () => {
        if (onShipmentClick) {
          onShipmentClick(shipment.shipmentId);

          // Zoom to the shipment location
          map.flyTo({
            center: [currentPos.lng, currentPos.lat],
            zoom: 5,
            duration: 1500,
            essential: true
          });
        }
      };

      const markerPos: [number, number] = [currentPos.lng, currentPos.lat];

      // For ALERT shipments, use GeoJSON layer (works with globe projection)
      // For others, use HTML markers
      if (isAlert) {
        // Add alert point as GeoJSON source + layers
        const alertSourceId = `alert-${shipment.shipmentId}`;
        const alertLayerId = `alert-layer-${shipment.shipmentId}`;
        const alertPulseLayerId = `alert-pulse-${shipment.shipmentId}`;
        const alertIconLayerId = `alert-icon-${shipment.shipmentId}`;

        map.addSource(alertSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { shipmentId: shipment.shipmentId },
            geometry: {
              type: 'Point',
              coordinates: end  // Use destination coordinates
            }
          }
        });

        // Pulsing outer circle (alert indicator)
        map.addLayer({
          id: alertPulseLayerId,
          type: 'circle',
          source: alertSourceId,
          paint: {
            'circle-radius': 25,
            'circle-color': '#DC2626',
            'circle-opacity': 0.4,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#DC2626',
          }
        });

        // Solid background circle for the plane
        map.addLayer({
          id: alertLayerId,
          type: 'circle',
          source: alertSourceId,
          paint: {
            'circle-radius': 14,
            'circle-color': '#DC2626',
            'circle-opacity': 1,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          }
        });

        // Plane icon using symbol layer
        map.addLayer({
          id: alertIconLayerId,
          type: 'symbol',
          source: alertSourceId,
          layout: {
            'icon-image': 'airport',
            'icon-size': 1.2,
            'icon-allow-overlap': true,
          },
          paint: {
            'icon-color': '#FFFFFF',
          }
        });

        // Add click handler for alert layers
        [alertLayerId, alertIconLayerId].forEach(layerId => {
          map.on('click', layerId, () => {
            if (onShipmentClick) {
              onShipmentClick(shipment.shipmentId);
              map.flyTo({ center: end as [number, number], zoom: 5, duration: 1500 });
            }
          });
          map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
        });
      } else {
        // Regular HTML marker for non-alert shipments
        const shipmentMarker = new mapboxgl.Marker({ element: shipmentEl, anchor: 'center' })
          .setLngLat(markerPos)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="text-xs">
                <strong>${shipment.shipmentId}</strong><br/>
                ${shipment.status}
              </div>`
            )
          )
          .addTo(map);

        markersRef.current.push(shipmentMarker);
      }
    });

    // Zoom to highlighted shipment or fit bounds to show all
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
          zoom: 5,
          duration: 1500,
          essential: true
        });
      }
    } else if (mapShipments.length > 0) {
      // Fit bounds to show all shipments
      const bounds = new mapboxgl.LngLatBounds();
      mapShipments.forEach(({ route }) => {
        bounds.extend([route.origin.coordinates.lng, route.origin.coordinates.lat]);
        bounds.extend([route.destination.coordinates.lng, route.destination.coordinates.lat]);
      });
      map.fitBounds(bounds, { padding: 50, maxZoom: 4 });
    }
  }, [mapShipments, highlightedShipmentId, onShipmentClick, mapLoaded]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
}
