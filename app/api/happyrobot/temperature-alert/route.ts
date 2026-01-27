import { NextRequest, NextResponse } from 'next/server';
import { publishEvent, CHANNELS } from '@/lib/redis';
import prisma from '@/lib/db';

// HappyRobot webhook for temperature alert
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Update shipment with alert
    const shipment = await prisma.shipment.update({
      where: { shipmentId: data.shipmentId },
      data: {
        status: 'ALERT',
        alertType: 'TEMPERATURE_EXCURSION',
        alertSeverity: 'CRITICAL',
        lastUpdate: new Date(),
      },
    });

    // Create milestone with temperature alert
    await prisma.shipmentMilestone.create({
      data: {
        shipmentId: data.shipmentId,
        code: 'TEMP_ALERT',
        description: 'Temperature Excursion Detected',
        location: data.location,
        planned: new Date(),
        actual: new Date(),
        status: 'ALERT',
        temperature: data.temperature,
        alert: {
          type: 'TEMPERATURE_EXCURSION',
          severity: 'CRITICAL',
          threshold: data.threshold,
          reading: data.temperature,
          message: data.message,
        },
      },
    });

    // Publish to Redis for real-time updates
    await publishEvent(CHANNELS.TEMPERATURE_ALERT, {
      shipmentId: data.shipmentId,
      temperature: data.temperature,
      threshold: data.threshold,
      message: data.message,
      location: data.location,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, shipment });
  } catch (error) {
    console.error('[Temperature Alert Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process temperature alert' },
      { status: 500 }
    );
  }
}
