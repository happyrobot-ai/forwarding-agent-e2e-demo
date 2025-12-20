import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/service-centers - List all service centers
export async function GET() {
  try {
    const serviceCenters = await prisma.serviceCenter.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(serviceCenters);
  } catch (error) {
    console.error("Error fetching service centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch service centers" },
      { status: 500 }
    );
  }
}
