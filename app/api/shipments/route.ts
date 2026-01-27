import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Get all shipments
export async function GET() {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { lastUpdate: 'desc' },
      include: {
        milestones: {
          orderBy: { planned: 'asc' },
        },
      },
    });

    // Sort to put alerts first, then by last update
    const sorted = shipments.sort((a, b) => {
      // Alerts always come first
      if (a.status === 'ALERT' && b.status !== 'ALERT') return -1;
      if (a.status !== 'ALERT' && b.status === 'ALERT') return 1;

      // Within same status, sort by last update (newest first)
      return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('[Shipments API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}
