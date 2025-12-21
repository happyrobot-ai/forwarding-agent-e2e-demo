import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { writeIncidentLog } from "@/lib/incident-logger";

// Unified resource type for discovery results
interface DiscoveredResource {
  id: string;
  name: string;
  type: string;           // Service center type or warehouse type
  resourceType: "SERVICE_CENTER" | "WAREHOUSE";
  lat: number;
  lng: number;
  phone?: string;
  distance: number;
  rank?: number;
}

// Haversine formula to calculate distance between two lat/lng points in miles
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    // 1. Fetch incident with linked order
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        order: {
          include: {
            truck: true,
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // 2. If already COMPLETED, return cached resources from JSON field
    if (incident.discoveryStatus === "COMPLETED") {
      const cachedResources = incident.discoveredResources as unknown as DiscoveredResource[];
      console.log(`[Discovery] Incident ${incidentId} already completed, returning ${cachedResources.length} cached resources`);

      return NextResponse.json({
        status: "COMPLETED",
        candidates: cachedResources,
      });
    }

    // 3. If already RUNNING, tell client to wait for Pusher events
    if (incident.discoveryStatus === "RUNNING") {
      console.log(`[Discovery] Incident ${incidentId} already running, client should wait for Pusher events`);
      return NextResponse.json({ status: "RUNNING" });
    }

    // --- START NEW DISCOVERY (Cinematic Flow) ---
    console.log(`[Discovery] Starting discovery for incident ${incidentId}`);

    // A. Mark as RUNNING immediately
    await prisma.incident.update({
      where: { id: incidentId },
      data: { discoveryStatus: "RUNNING" },
    });

    // B. Calculate truck position from order data
    const order = incident.order;
    if (!order) {
      console.error(`[Discovery] No order linked to incident ${incidentId}`);
      await prisma.incident.update({
        where: { id: incidentId },
        data: { discoveryStatus: "COMPLETED" },
      });
      return NextResponse.json({ status: "COMPLETED", candidates: [] });
    }

    const progress = order.progress ?? 50;
    const routePoints = order.routeGeoJson as number[][] | null;

    let truckLat: number, truckLng: number;

    if (routePoints && routePoints.length > 0) {
      // Interpolate position along route based on progress
      const pointIndex = Math.floor((progress / 100) * (routePoints.length - 1));
      const point = routePoints[Math.min(pointIndex, routePoints.length - 1)];
      truckLng = point[0];
      truckLat = point[1];
    } else {
      // Fallback: interpolate between start and end
      truckLat = order.startLat + (order.endLat - order.startLat) * (progress / 100);
      truckLng = order.startLng + (order.endLng - order.startLng) * (progress / 100);
    }

    console.log(`[Discovery] Truck position: ${truckLat.toFixed(4)}, ${truckLng.toFixed(4)}`);

    // C. Query service centers AND warehouses
    const [serviceCenters, warehouses] = await Promise.all([
      prisma.serviceCenter.findMany({
        where: {
          type: {
            in: ["REPAIR_SHOP", "MOBILE_MECHANIC", "TOWING_SERVICE", "TRUCK_STOP"],
          },
        },
      }),
      prisma.warehouse.findMany(),
    ]);

    // D. Calculate distances for service centers
    const serviceCenterResources: DiscoveredResource[] = serviceCenters.map(center => ({
      id: center.id,
      name: center.name,
      type: center.type,
      resourceType: "SERVICE_CENTER" as const,
      lat: center.lat,
      lng: center.lng,
      phone: center.phone,
      distance: haversineDistance(truckLat, truckLng, center.lat, center.lng),
    }));

    // E. Calculate distances for warehouses
    const warehouseResources: DiscoveredResource[] = warehouses.map(warehouse => ({
      id: warehouse.id,
      name: warehouse.name,
      type: warehouse.type, // "BROADLINE_HUB" or "REGIONAL_HUB"
      resourceType: "WAREHOUSE" as const,
      lat: warehouse.lat,
      lng: warehouse.lng,
      phone: undefined, // Warehouses don't have phone in our schema
      distance: haversineDistance(truckLat, truckLng, warehouse.lat, warehouse.lng),
    }));

    // F. Combine and sort by distance, take top 3
    const allResources = [...serviceCenterResources, ...warehouseResources]
      .sort((a, b) => a.distance - b.distance);

    const top3 = allResources.slice(0, 3).map((resource, index) => ({
      ...resource,
      rank: index + 1,
    }));

    console.log(`[Discovery] Found top 3 resources (from ${serviceCenters.length} service centers + ${warehouses.length} warehouses):`,
      top3.map(r => `${r.name} [${r.resourceType}] (${r.distance.toFixed(1)}mi)`).join(", ")
    );

    // G. Save to JSON field on Incident (handles both warehouses and service centers)
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        discoveredResources: top3,
      },
    });

    // H. Fire-and-forget async workflow for cinematic reveal
    (async () => {
      try {
        // Initial delay before starting discovery
        await delay(1500);

        // Send "analyzing" log event - persisted to DB
        await writeIncidentLog(
          incidentId,
          "Initiating geospatial scan for recovery assets and Sysco facilities...",
          "DISCOVERY",
          "INFO"
        );

        // Send discovery events with delays (1.5s between each)
        for (let i = 0; i < top3.length; i++) {
          await delay(1500);

          const resource = top3[i];
          const resourceLabel = resource.resourceType === "WAREHOUSE"
            ? "Sysco Facility"
            : "Service Center";

          console.log(`[Discovery] Sending discovery event ${i + 1}: ${resource.name} [${resource.resourceType}]`);

          // Send log update with resource-type-specific messaging - persisted to DB
          const message = resource.resourceType === "WAREHOUSE"
            ? `Located Sysco ${resource.type.replace(/_/g, ' ')}: ${resource.name} (${resource.distance.toFixed(1)} mi). Backup inventory available.`
            : `Located ${resourceLabel}: ${resource.name} (${resource.distance.toFixed(1)} mi). Capability match: 98%.`;

          await writeIncidentLog(incidentId, message, "DISCOVERY", "SUCCESS");

          // Send map reveal event (tagged with incidentId for filtering)
          await pusherServer.trigger("sysco-demo", "resource-located", {
            incidentId: incidentId,
            serviceCenter: resource, // Keep field name for backwards compatibility
            rank: i + 1,
            timestamp: new Date().toISOString(),
          });
        }

        // Final log: discovery complete
        await delay(1000);
        const warehouseCount = top3.filter((r: DiscoveredResource) => r.resourceType === "WAREHOUSE").length;
        const serviceCenterCount = top3.filter((r: DiscoveredResource) => r.resourceType === "SERVICE_CENTER").length;

        await writeIncidentLog(
          incidentId,
          `Identified ${top3.length} recovery options: ${serviceCenterCount} service center${serviceCenterCount !== 1 ? 's' : ''}, ${warehouseCount} Sysco facilit${warehouseCount !== 1 ? 'ies' : 'y'}. Nearest: ${top3[0]?.name} (${top3[0]?.distance.toFixed(1)} mi)`,
          "DISCOVERY",
          "SUCCESS"
        );

        // Mark as completed
        await prisma.incident.update({
          where: { id: incidentId },
          data: { discoveryStatus: "COMPLETED" },
        });

        console.log(`[Discovery] Completed for incident ${incidentId}`);
      } catch (err) {
        console.error("[Discovery] Error in background workflow:", err);
        // Still mark as completed so we don't get stuck
        await prisma.incident.update({
          where: { id: incidentId },
          data: { discoveryStatus: "COMPLETED" },
        });
      }
    })();

    // Respond immediately with STARTED status
    return NextResponse.json({ status: "STARTED" });
  } catch (error) {
    console.error("Error in discovery endpoint:", error);
    return NextResponse.json(
      { error: "Failed to run discovery" },
      { status: 500 }
    );
  }
}
