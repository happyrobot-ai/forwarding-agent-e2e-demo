import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { writeIncidentLog } from "@/lib/incident-logger";

// Inline types for Prisma query results
interface ServiceCenterRow {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  phone: string;
}

interface WarehouseRow {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
}

interface OrderWithTruck {
  id: string;
  destination: string;
  endLat: number;
  endLng: number;
  status: string;
  progress: number | null;
  estimatedArrival: Date | null;
  truck: {
    id: string;
    driverName: string;
  } | null;
}

// Type for unified candidate table with includes
interface CandidateWithRelations {
  candidateType: "SERVICE_CENTER" | "WAREHOUSE" | "DRIVER";
  distance: number;
  rank: number;
  // Driver-specific fields
  lat: number | null;
  lng: number | null;
  currentLocation: string | null;
  status: string | null;
  progress: number | null;
  nearestDropOffId: string | null;
  nearestDropOffName: string | null;
  nearestDropOffDistance: number | null;
  // Relations (only one populated based on candidateType)
  serviceCenter: {
    id: string;
    name: string;
    type: string;
    lat: number;
    lng: number;
    phone: string;
  } | null;
  warehouse: {
    id: string;
    name: string;
    type: string;
    lat: number;
    lng: number;
  } | null;
  truck: {
    id: string;
    driverName: string;
  } | null;
}

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

// Available driver for trailer relay
interface DiscoveredDriver {
  id: string;
  orderId: string;
  driverName: string;
  truckId: string;
  currentLocation: string;  // Where they are (delivery destination)
  lat: number;
  lng: number;
  distance: number;         // From incident
  status: "DELIVERED" | "COMPLETING";  // DELIVERED = done, COMPLETING = 90%+ progress
  progress?: number;
  nearestDropOff?: {        // Nearest Sysco hub for trailer drop
    id: string;
    name: string;
    distance: number;
  };
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

    // 1. Fetch incident with linked order and candidates
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        order: {
          include: {
            truck: true,
          },
        },
        // Include unified candidates for COMPLETED status
        candidates: {
          include: {
            serviceCenter: true,
            warehouse: true,
            truck: true,
          },
          orderBy: { rank: "asc" },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // 2. If already COMPLETED, return cached resources from unified candidates table
    if (incident.discoveryStatus === "COMPLETED") {
      // Filter candidates by type and transform to response format
      const resourceCandidates = incident.candidates.filter(
        (c: CandidateWithRelations) => c.candidateType === "SERVICE_CENTER" || c.candidateType === "WAREHOUSE"
      );

      const cachedResources: DiscoveredResource[] = resourceCandidates
        .map((c: CandidateWithRelations): DiscoveredResource | null => {
          if (c.candidateType === "SERVICE_CENTER" && c.serviceCenter) {
            return {
              id: c.serviceCenter.id,
              name: c.serviceCenter.name,
              type: c.serviceCenter.type,
              resourceType: "SERVICE_CENTER" as const,
              lat: c.serviceCenter.lat,
              lng: c.serviceCenter.lng,
              phone: c.serviceCenter.phone,
              distance: c.distance,
              rank: c.rank,
            };
          } else if (c.candidateType === "WAREHOUSE" && c.warehouse) {
            return {
              id: c.warehouse.id,
              name: c.warehouse.name,
              type: c.warehouse.type,
              resourceType: "WAREHOUSE" as const,
              lat: c.warehouse.lat,
              lng: c.warehouse.lng,
              distance: c.distance,
              rank: c.rank,
            };
          }
          return null;
        })
        .filter((r: DiscoveredResource | null): r is DiscoveredResource => r !== null)
        .sort((a: DiscoveredResource, b: DiscoveredResource) => (a.rank ?? 99) - (b.rank ?? 99));

      // Transform driver candidates to DiscoveredDriver format
      const driverCandidates = incident.candidates.filter(
        (c: CandidateWithRelations) => c.candidateType === "DRIVER" && c.truck
      );

      const cachedDrivers: DiscoveredDriver[] = driverCandidates.map((c: CandidateWithRelations) => ({
        id: c.truck!.id,
        orderId: "", // Not stored in candidate table
        driverName: c.truck!.driverName,
        truckId: c.truck!.id,
        currentLocation: c.currentLocation ?? "",
        lat: c.lat ?? 0,
        lng: c.lng ?? 0,
        distance: c.distance,
        status: (c.status as "DELIVERED" | "COMPLETING") ?? "DELIVERED",
        progress: c.progress ?? undefined,
        nearestDropOff: c.nearestDropOffId ? {
          id: c.nearestDropOffId,
          name: c.nearestDropOffName ?? "",
          distance: c.nearestDropOffDistance ?? 0,
        } : undefined,
        rank: c.rank,
      }));

      console.log(`[Discovery] Incident ${incidentId} already completed, returning ${cachedResources.length} cached resources and ${cachedDrivers.length} cached drivers`);

      return NextResponse.json({
        status: "COMPLETED",
        candidates: cachedResources,
        drivers: cachedDrivers,
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

    // C. Query service centers, warehouses, AND available drivers
    const [serviceCenters, warehouses, availableOrders] = await Promise.all([
      prisma.serviceCenter.findMany({
        where: {
          type: {
            in: ["REPAIR_SHOP", "MOBILE_MECHANIC", "TOWING_SERVICE", "TRUCK_STOP"],
          },
        },
      }),
      prisma.warehouse.findMany(),
      // Phase 2: Find drivers who just finished or are arriving soon (ETA within 30 min)
      prisma.order.findMany({
        where: {
          AND: [
            // Exclude the incident truck
            { id: { not: order.id } },
            // Exclude AT_RISK orders
            { status: { not: "AT_RISK" } },
            // Must have a truck assigned
            { truck: { isNot: null } },
            // Either DELIVERED or ETA is within 30 minutes from now
            {
              OR: [
                { status: "DELIVERED" },
                { estimatedArrival: { lte: new Date(Date.now() + 30 * 60 * 1000) } }, // ETA within 30 min
              ],
            },
          ],
        },
        include: {
          truck: true,
        },
      }),
    ]);

    // D. Calculate distances for service centers
    const serviceCenterResources: DiscoveredResource[] = serviceCenters.map((center: ServiceCenterRow) => ({
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
    const warehouseResources: DiscoveredResource[] = warehouses.map((warehouse: WarehouseRow) => ({
      id: warehouse.id,
      name: warehouse.name,
      type: warehouse.type, // "BROADLINE_HUB" or "REGIONAL_HUB"
      resourceType: "WAREHOUSE" as const,
      lat: warehouse.lat,
      lng: warehouse.lng,
      phone: undefined, // Warehouses don't have phone in our schema
      distance: haversineDistance(truckLat, truckLng, warehouse.lat, warehouse.lng),
    }));

    // E2. Phase 2: Process available drivers for trailer relay
    const availableDrivers: DiscoveredDriver[] = availableOrders
      .filter((o: OrderWithTruck) => o.truck) // TypeScript safety
      .map((driverOrder: OrderWithTruck) => {
        // Driver is at their delivery destination (endLat/endLng)
        const driverLat = driverOrder.endLat;
        const driverLng = driverOrder.endLng;
        const distanceFromIncident = haversineDistance(truckLat, truckLng, driverLat, driverLng);

        // Find nearest Sysco hub (warehouse) for trailer drop-off
        const nearestHub = warehouseResources
          .map(wh => ({
            id: wh.id,
            name: wh.name,
            distance: haversineDistance(driverLat, driverLng, wh.lat, wh.lng),
          }))
          .sort((a, b) => a.distance - b.distance)[0];

        // Determine driver status based on order status and ETA
        let driverStatus: "DELIVERED" | "COMPLETING";
        if (driverOrder.status === "DELIVERED") {
          driverStatus = "DELIVERED";
        } else {
          // "COMPLETING" = ETA within 30 min (arriving soon)
          driverStatus = "COMPLETING";
        }

        return {
          id: driverOrder.truck!.id,
          orderId: driverOrder.id,
          driverName: driverOrder.truck!.driverName,
          truckId: driverOrder.truck!.id,
          currentLocation: driverOrder.destination,
          lat: driverLat,
          lng: driverLng,
          distance: distanceFromIncident,
          status: driverStatus,
          progress: driverOrder.progress ?? undefined,
          nearestDropOff: nearestHub ? {
            id: nearestHub.id,
            name: nearestHub.name,
            distance: nearestHub.distance,
          } : undefined,
        };
      })
      .sort((a: DiscoveredDriver, b: DiscoveredDriver) => a.distance - b.distance);

    // Take top 3 drivers
    const top3Drivers = availableDrivers.slice(0, 3).map((driver, index) => ({
      ...driver,
      rank: index + 1,
    }));

    console.log(`[Discovery] Found ${availableDrivers.length} available drivers, top 3:`,
      top3Drivers.map(d => `${d.driverName} @ ${d.currentLocation} (${d.distance.toFixed(1)}mi, ${d.status})`).join(", ")
    );

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

    // G. Save to unified IncidentCandidate table
    await Promise.all([
      // Save service center and warehouse candidates
      ...top3.map(resource =>
        prisma.incidentCandidate.create({
          data: {
            incidentId,
            candidateType: resource.resourceType,
            serviceCenterId: resource.resourceType === "SERVICE_CENTER" ? resource.id : null,
            warehouseId: resource.resourceType === "WAREHOUSE" ? resource.id : null,
            distance: resource.distance,
            rank: resource.rank!,
          },
        })
      ),
      // Save driver candidates
      ...top3Drivers.map(driver =>
        prisma.incidentCandidate.create({
          data: {
            incidentId,
            candidateType: "DRIVER",
            truckId: driver.truckId,
            distance: driver.distance,
            rank: driver.rank!,
            // Driver-specific snapshot fields
            lat: driver.lat,
            lng: driver.lng,
            currentLocation: driver.currentLocation,
            status: driver.status,
            progress: driver.progress ?? null,
            nearestDropOffId: driver.nearestDropOff?.id ?? null,
            nearestDropOffName: driver.nearestDropOff?.name ?? null,
            nearestDropOffDistance: driver.nearestDropOff?.distance ?? null,
          },
        })
      ),
    ]);

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

        // Phase 1 summary log
        await delay(1000);
        const warehouseCount = top3.filter((r: DiscoveredResource) => r.resourceType === "WAREHOUSE").length;
        const serviceCenterCount = top3.filter((r: DiscoveredResource) => r.resourceType === "SERVICE_CENTER").length;

        await writeIncidentLog(
          incidentId,
          `Identified ${top3.length} recovery options: ${serviceCenterCount} service center${serviceCenterCount !== 1 ? 's' : ''}, ${warehouseCount} Sysco facilit${warehouseCount !== 1 ? 'ies' : 'y'}. Nearest: ${top3[0]?.name} (${top3[0]?.distance.toFixed(1)} mi)`,
          "DISCOVERY",
          "SUCCESS"
        );

        // ==========================================
        // PHASE 2: DRIVER DISCOVERY (Trailer Relay)
        // ==========================================
        if (top3Drivers.length > 0) {
          await delay(1500);

          await writeIncidentLog(
            incidentId,
            "Scanning fleet for available drivers near incident location...",
            "DISCOVERY",
            "INFO"
          );

          // Send driver discovery events with delays
          for (let i = 0; i < top3Drivers.length; i++) {
            await delay(1500);

            const driver = top3Drivers[i];
            const statusLabel = driver.status === "DELIVERED" ? "completed delivery" : `${driver.progress}% complete`;

            console.log(`[Discovery] Sending driver event ${i + 1}: ${driver.driverName} [${driver.status}]`);

            // Log message with trailer drop-off info
            const dropOffInfo = driver.nearestDropOff
              ? ` Trailer drop: ${driver.nearestDropOff.name} (${driver.nearestDropOff.distance.toFixed(1)} mi).`
              : "";

            await writeIncidentLog(
              incidentId,
              `Located driver: ${driver.driverName} (${driver.truckId}) at ${driver.currentLocation} (${driver.distance.toFixed(1)} mi). Status: ${statusLabel}.${dropOffInfo}`,
              "DISCOVERY",
              "SUCCESS"
            );

            // Send driver reveal event for map markers
            await pusherServer.trigger("sysco-demo", "driver-located", {
              incidentId: incidentId,
              driver: driver,
              rank: i + 1,
              timestamp: new Date().toISOString(),
            });
          }

          // Phase 2 summary
          await delay(1000);
          const deliveredCount = top3Drivers.filter(d => d.status === "DELIVERED").length;
          const completingCount = top3Drivers.filter(d => d.status === "COMPLETING").length;

          await writeIncidentLog(
            incidentId,
            `Identified ${top3Drivers.length} available driver${top3Drivers.length !== 1 ? 's' : ''} for trailer relay: ${deliveredCount} delivered, ${completingCount} completing. Nearest: ${top3Drivers[0]?.driverName} (${top3Drivers[0]?.distance.toFixed(1)} mi)`,
            "DISCOVERY",
            "SUCCESS"
          );
        }

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
