import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding HappyRobot Forwarding Demo Data...\n");

  // Load JSON data
  const emailData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../lib/seed-data/email-inbox.json"), "utf-8")
  );
  const shipmentData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../lib/seed-data/shipments-dashboard.json"), "utf-8")
  );

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await prisma.shipmentMilestone.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.email.deleteMany();
  await prisma.booking.deleteMany();

  // Seed emails
  console.log("\n📧 Seeding emails...");
  const emails = emailData.emails || [];
  for (const email of emails) {
    await prisma.email.create({
      data: {
        emailId: email.emailId,
        threadId: email.threadId,
        fromName: email.from?.name || "Unknown",
        fromEmail: email.from?.email || "unknown@example.com",
        fromCompany: email.from?.company || "Unknown Company",
        toEmail: "airfreight.ops@happyrobot.ai",
        subject: email.subject,
        receivedAt: new Date(email.receivedAt),
        classification: email.classification,
        intent: email.intent,
        priority: email.priority,
        status: email.status,
        assignedRepName: typeof email.assignedRep === 'string' ? email.assignedRep : null,
        assignedRepEmail: typeof email.assignedRep === 'string' ? `${email.assignedRep.toLowerCase().replace(/\s+/g, '.')}@happyrobot.ai` : null,
        linkedShipment: email.linkedShipment || null,
        summary: `${email.classification} from ${email.from?.company || 'Unknown'}: ${email.subject.substring(0, 100)}`,
        missingInfo: email.missingInfo || [],
        tags: email.tags || [],
        highlight: email.isKeyDemo || false,
      },
    });
  }
  console.log(`   ✅ Created ${emails.length} emails`);

  // Seed shipments
  console.log("\n✈️ Seeding shipments...");
  const shipments = shipmentData.shipments || [];
  for (const shipment of shipments) {
    const alert = shipment.alerts?.[0];
    await prisma.shipment.create({
      data: {
        shipmentId: shipment.shipmentId,
        mawbNumber: shipment.mawbNumber,
        bookingNumber: shipment.bookingNumber || null,
        customerCode: shipment.customer?.code || "UNKNOWN",
        customerName: shipment.customer?.name || "Unknown Customer",
        originCode: shipment.routing?.origin?.code || "XXX",
        originName: `${shipment.routing?.origin?.city || "Unknown"}, ${shipment.routing?.origin?.country || ""}`.trim(),
        destinationCode: shipment.routing?.destination?.code || "XXX",
        destinationName: `${shipment.routing?.destination?.city || "Unknown"}, ${shipment.routing?.destination?.country || ""}`.trim(),
        carrier: shipment.routing?.carrier || "Unknown Carrier",
        carrierCode: shipment.routing?.carrierCode || "XX",
        flightNumber: shipment.routing?.flightNumber || "XX000",
        status: shipment.status,
        alertType: alert?.type || null,
        alertSeverity: alert?.severity || null,
        temperatureSensitive: shipment.temperatureSensitive || false,
        temperatureMin: shipment.temperatureRange?.min || null,
        temperatureMax: shipment.temperatureRange?.max || null,
        temperatureUnit: shipment.temperatureRange?.unit || null,
        currentLat: shipment.currentLocation?.coordinates?.lat || null,
        currentLng: shipment.currentLocation?.coordinates?.lng || null,
        currentLocation: shipment.currentLocation?.name || null,
        progress: shipment.progress || 50,
        lastUpdate: new Date(),
      },
    });
  }
  console.log(`   ✅ Created ${shipments.length} shipments`);

  console.log("\n✨ HappyRobot Forwarding Demo data seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
