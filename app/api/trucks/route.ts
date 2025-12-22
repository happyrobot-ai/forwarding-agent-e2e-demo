import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/trucks - List all trucks with their current order info
export async function GET() {
  try {
    const trucks = await prisma.truck.findMany({
      include: {
        orders: {
          where: {
            // Only include active orders (not delivered)
            status: {
              in: ["CONFIRMED", "IN_TRANSIT", "AT_RISK"],
            },
          },
          select: {
            id: true,
            itemName: true,
            status: true,
            origin: true,
            destination: true,
            riskScore: true,
            progress: true,
            estimatedArrival: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Only get the most recent active order
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    // Transform to include currentOrder as a single object instead of array
    const transformedTrucks = trucks.map((truck) => ({
      ...truck,
      currentOrder: truck.orders[0] || null,
      orders: undefined, // Remove the orders array from response
    }));

    return NextResponse.json(transformedTrucks);
  } catch (error) {
    console.error("Error fetching trucks:", error);
    return NextResponse.json(
      { error: "Failed to fetch trucks" },
      { status: 500 }
    );
  }
}
