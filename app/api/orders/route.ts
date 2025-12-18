import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/orders - List all orders with truck info
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        truck: true, // Include Samsara truck info
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
