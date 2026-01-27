import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { publishEvent, CHANNELS } from "@/lib/redis";

export async function POST() {
  try {
    console.log('[Demo Reset] Starting reset...');

    // Clear DSV demo data
    await prisma.happyRobotRun.deleteMany();
    await prisma.shipmentMilestone.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.email.deleteMany();

    // Also clear old Sysco demo data if it exists
    await prisma.agentRun.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.order.deleteMany({ where: { id: { startsWith: "INCIDENT" } } });

    console.log('[Demo Reset] Cleared existing data');

    // Seed initial data from JSON files
    const emailData = require('@/lib/seed-data/email-inbox.json');
    const shipmentsData = require('@/lib/seed-data/shipments-dashboard.json');
    const milestonesData = require('@/lib/seed-data/shipment-milestones.json');

    // Seed first 30 emails for realistic inbox
    const emailsToSeed = emailData.emails.slice(0, 30);
    for (const email of emailsToSeed) {
      await prisma.email.create({
        data: {
          emailId: email.emailId,
          threadId: email.threadId,
          fromName: email.from.name,
          fromEmail: email.from.email,
          fromCompany: email.from.company,
          toEmail: email.to || 'operations@dsv.com',
          subject: email.subject,
          receivedAt: new Date(email.receivedAt),
          classification: email.classification,
          intent: email.intent,
          priority: email.priority,
          status: email.status,
          assignedRepName: typeof email.assignedRep === 'string' ? email.assignedRep : email.assignedRep?.name,
          assignedRepEmail: typeof email.assignedRep === 'object' ? email.assignedRep?.email : undefined,
          linkedShipment: email.linkedShipment,
          summary: email.summary || `${email.classification.replace(/_/g, ' ')} from ${email.from.company}`,
          missingInfo: email.missingInfo || [],
          tags: email.tags || [],
          highlight: email.highlight || email.isKeyDemo || false,
        },
      });
    }
    console.log(`[Demo Reset] Seeded ${emailsToSeed.length} emails`);

    // Seed shipments (all from JSON)
    const shipmentsToSeed = shipmentsData.shipments;
    for (const shipment of shipmentsToSeed) {
      await prisma.shipment.create({
        data: {
          shipmentId: shipment.shipmentId,
          mawbNumber: shipment.mawbNumber,
          bookingNumber: shipment.bookingNumber,
          customerCode: shipment.customer.code,
          customerName: shipment.customer.name,
          originCode: shipment.routing.origin.code,
          originName: shipment.routing.origin.city,
          destinationCode: shipment.routing.destination.code,
          destinationName: shipment.routing.destination.city,
          carrier: shipment.routing.carrier,
          carrierCode: shipment.routing.carrierCode,
          flightNumber: shipment.routing.flightNumber,
          status: shipment.status,
          alertType: shipment.alerts?.length > 0 ? shipment.alerts[0].type : null,
          alertSeverity: shipment.alerts?.length > 0 ? shipment.alerts[0].severity : null,
          temperatureSensitive: shipment.temperatureSensitive,
          temperatureMin: shipment.temperatureRange?.min,
          temperatureMax: shipment.temperatureRange?.max,
          temperatureUnit: shipment.temperatureRange?.unit,
          currentLat: shipment.currentLocation?.coordinates?.lat,
          currentLng: shipment.currentLocation?.coordinates?.lng,
          currentLocation: shipment.currentLocation?.name,
          progress: shipment.routing.origin.code === shipment.routing.destination.code ? 100 :
                    shipment.status === 'DELIVERED' ? 100 :
                    shipment.status === 'ALERT' ? 95 : // At destination with alert
                    shipment.status === 'IN_TRANSIT' ? 50 :
                    shipment.status === 'CUSTOMS_HOLD' ? 85 :
                    shipment.status === 'BOOKED' ? 5 : 0,
          lastUpdate: new Date(shipment.currentLocation?.lastUpdate || shipment.dates.pickup || shipment.dates.eta || shipment.dates.etd || new Date()),
        },
      });

      // Seed milestones for this shipment if they exist
      const shipmentMilestones = milestonesData.shipmentMilestones[shipment.shipmentId];
      if (shipmentMilestones) {
        for (const milestone of shipmentMilestones.milestones) {
          await prisma.shipmentMilestone.create({
            data: {
              shipmentId: shipment.shipmentId,
              code: milestone.code,
              description: milestone.description,
              location: milestone.location,
              facility: milestone.facility || null,
              flight: milestone.flight || null,
              planned: milestone.planned ? new Date(milestone.planned) : null,
              actual: milestone.actual ? new Date(milestone.actual) : null,
              status: milestone.status,
              temperature: milestone.temperature || null,
              alert: milestone.alert || null,
              note: milestone.note || null,
            },
          });
        }
      }
    }
    console.log(`[Demo Reset] Seeded ${shipmentsToSeed.length} shipments with milestones`);

    // Broadcast reset event
    await publishEvent(CHANNELS.DEMO_RESET, {
      message: 'Demo reset - System restored to initial state',
      timestamp: new Date().toISOString(),
    });

    console.log('[Demo Reset] Complete');

    return NextResponse.json({
      success: true,
      message: "Demo reset complete",
      seeded: {
        emails: emailsToSeed.length,
        shipments: shipmentsToSeed.length,
      }
    });
  } catch (error) {
    console.error("Error resetting demo:", error);
    return NextResponse.json(
      { error: "Failed to reset demo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
