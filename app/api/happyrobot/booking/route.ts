import { NextRequest, NextResponse } from 'next/server';
import { publishEvent, CHANNELS } from '@/lib/redis';
import prisma from '@/lib/db';

// HappyRobot webhook for booking created
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Save booking to database
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: data.conversionTracking.bookingNumber,
        quotationNumber: data.quotation.quotationNumber,
        shipmentNumber: data.conversionTracking.shipmentNumber,
        mawbNumber: data.conversionTracking.mawbNumber,

        customerCode: data.customerDetails.customerCode,
        customerName: data.customerDetails.customerName,
        customerReference: data.customerDetails.customerReference,

        origin: data.routingDetails.origin.name,
        originCode: data.routingDetails.origin.locationCode,
        destination: data.routingDetails.destination.name,
        destinationCode: data.routingDetails.destination.locationCode,

        carrier: data.selectedQuoteOption.routing.carrierName,
        carrierCode: data.selectedQuoteOption.routing.carrier,
        flightNumber: data.selectedQuoteOption.routing.flightNumber,

        commodity: data.cargoDetails.commodityDescription,
        pieces: data.cargoDetails.pieces,
        weight: data.cargoDetails.grossWeight,
        weightUnit: data.cargoDetails.grossWeightUnit,
        volume: data.cargoDetails.volume,
        volumeUnit: data.cargoDetails.volumeUnit,

        temperatureSensitive: data.temperatureControl.required,
        temperatureMin: data.temperatureControl.minTemp,
        temperatureMax: data.temperatureControl.maxTemp,
        temperatureSetPoint: data.temperatureControl.setPoint,
        temperatureUnit: data.temperatureControl.tempUnit,

        status: 'CONFIRMED',
        createdAt: new Date(data.quotation.createdDate),

        // Store full data as JSON for reference
        quotationData: data,
      },
    });

    // Publish to Redis for real-time updates
    await publishEvent(CHANNELS.BOOKING_CREATED, {
      booking,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('[Booking Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process booking' },
      { status: 500 }
    );
  }
}
