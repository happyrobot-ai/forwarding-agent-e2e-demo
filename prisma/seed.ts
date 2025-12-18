import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN is not defined");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Real Texas/US city coordinates for realistic routes
const TEXAS_CITIES = [
  { name: "Houston", lat: 29.7604, lng: -95.3698 },
  { name: "Dallas", lat: 32.7767, lng: -96.7970 },
  { name: "San Antonio", lat: 29.4241, lng: -98.4936 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Fort Worth", lat: 32.7555, lng: -97.3308 },
  { name: "El Paso", lat: 31.7619, lng: -106.4850 },
  { name: "Corpus Christi", lat: 27.8006, lng: -97.3964 },
  { name: "Lubbock", lat: 33.5779, lng: -101.8552 },
  { name: "Amarillo", lat: 35.2220, lng: -101.8313 },
  { name: "Midland", lat: 31.9973, lng: -102.0779 },
  { name: "Waco", lat: 31.5493, lng: -97.1467 },
  { name: "Abilene", lat: 32.4487, lng: -99.7331 },
];

// Surrounding states for longer routes
const REGIONAL_CITIES = [
  { name: "Oklahoma City", lat: 35.4676, lng: -97.5164 },
  { name: "New Orleans", lat: 29.9511, lng: -90.0715 },
  { name: "Phoenix", lat: 33.4484, lng: -112.0740 },
  { name: "Denver", lat: 39.7392, lng: -104.9903 },
  { name: "Memphis", lat: 35.1495, lng: -90.0490 },
];

const PRODUCT_CATEGORIES = [
  { name: "Fresh Produce", baseValue: 8000, description: "Temperature-controlled fresh vegetables and fruits" },
  { name: "Frozen Seafood", baseValue: 25000, description: "Premium frozen seafood requiring -18°C storage" },
  { name: "Dairy Products", baseValue: 12000, description: "Refrigerated dairy including milk, cheese, and yogurt" },
  { name: "Beef Products", baseValue: 35000, description: "USDA Prime and Choice beef cuts" },
  { name: "Poultry", baseValue: 15000, description: "Fresh and frozen chicken and turkey products" },
  { name: "Bakery Items", baseValue: 6000, description: "Fresh-baked bread, pastries, and desserts" },
  { name: "Beverages", baseValue: 10000, description: "Soft drinks, juices, and specialty beverages" },
  { name: "Dry Goods", baseValue: 5000, description: "Shelf-stable pantry items and canned goods" },
];

const CARRIERS = [
  "Sysco Fleet",
  "Prime Logistics",
  "Werner Enterprises",
  "Swift Transportation",
  "Sysco Refrigerated",
  "Texas Freight Lines",
];

// Driver names for the fleet
const DRIVER_NAMES = [
  "Marcus Johnson",
  "Sarah Mitchell",
  "David Rodriguez",
  "Jennifer Williams",
  "Michael Chen",
  "Emily Davis",
  "Robert Garcia",
  "Amanda Thompson",
  "Christopher Lee",
  "Jessica Martinez",
  "Daniel Brown",
  "Ashley Wilson",
  "Matthew Taylor",
  "Stephanie Anderson",
  "Andrew Thomas",
  "Nicole Jackson",
  "Joshua White",
  "Samantha Harris",
  "Ryan Martin",
  "Lauren Clark",
  "Kevin Lewis",
  "Brittany Robinson",
  "Brandon Walker",
  "Megan Hall",
  "Justin Young",
];

const VEHICLE_TYPES = ["REFRIGERATED", "DRY_VAN", "FLATBED", "TANKER"] as const;

// Fetch route from Mapbox Directions API
async function fetchRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<number[][] | null> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=simplified&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch route: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates;
    }
    return null;
  } catch (error) {
    console.warn("Error fetching route:", error);
    return null;
  }
}

function getRandomCity(cities: typeof TEXAS_CITIES) {
  return cities[Math.floor(Math.random() * cities.length)];
}

function getRandomProduct() {
  const category = PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)];
  const pallets = Math.floor(Math.random() * 8) + 1;
  // Calculate value based on pallets (each pallet multiplies base value by 0.8-1.2)
  const valueMultiplier = 0.8 + Math.random() * 0.4;
  const orderValue = Math.round(category.baseValue * pallets * valueMultiplier);
  return {
    itemName: `${category.name} (${pallets} Pallets)`,
    description: category.description,
    orderValue,
  };
}

function getRandomCarrier(index: number) {
  const carrier = CARRIERS[Math.floor(Math.random() * CARRIERS.length)];
  return carrier.includes("Sysco") ? `${carrier} #${800 + index}` : carrier;
}

// Rate limiting helper
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🌱 Seeding Enterprise Logistics Data with Real Routes...");
  console.log("📍 Fetching routes from Mapbox Directions API...\n");

  // Clear existing data (order matters due to foreign keys)
  await prisma.agentRun.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.truck.deleteMany({});

  // Create the Samsara fleet (25 trucks)
  console.log("🚛 Creating Samsara fleet...");
  const trucks: Array<{ id: string; driverName: string; vehicleType: typeof VEHICLE_TYPES[number] }> = [];

  for (let i = 0; i < 25; i++) {
    const truckId = `TRK-${800 + i}`;
    const truck = {
      id: truckId,
      driverName: DRIVER_NAMES[i],
      vehicleType: VEHICLE_TYPES[i % VEHICLE_TYPES.length],
    };
    trucks.push(truck);
    await prisma.truck.create({
      data: {
        id: truck.id,
        driverName: truck.driverName,
        vehicleType: truck.vehicleType,
        status: "ACTIVE",
      },
    });
  }
  console.log(`   Created ${trucks.length} trucks\n`);

  const orders: Array<{
    id: string;
    itemName: string;
    description: string;
    orderValue: number;
    status: string;
    carrier: string;
    truckId: string | null;
    origin: string;
    destination: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    riskScore: number;
    routeGeoJson: number[][] | null;
    progress: number;
  }> = [];

  // Generate routes - NO red/critical routes (those only appear during incidents)
  const routeConfigs = [
    // 18 Normal In-Transit routes (green, low risk)
    ...Array(18).fill(null).map((_, i) => ({
      id: `ORD-${8000 + i}`,
      status: "IN_TRANSIT",
      riskScore: Math.floor(Math.random() * 25), // 0-24 (green)
      isRegional: i % 4 === 0, // Some regional routes
    })),
    // 5 Confirmed routes (green, awaiting pickup)
    ...Array(5).fill(null).map((_, i) => ({
      id: `ORD-${8100 + i}`,
      status: "CONFIRMED",
      riskScore: Math.floor(Math.random() * 15), // 0-14 (green)
      isRegional: false,
    })),
    // 2 At-Risk routes (orange, minor delays - but NOT critical/red)
    ...Array(2).fill(null).map((_, i) => ({
      id: `DLY-${9000 + i}`,
      status: "IN_TRANSIT",
      riskScore: 45 + Math.floor(Math.random() * 25), // 45-69 (orange only)
      isRegional: true,
    })),
  ];

  let fetchedCount = 0;

  for (const config of routeConfigs) {
    let origin, dest;

    if (config.isRegional) {
      origin = getRandomCity(REGIONAL_CITIES);
      dest = getRandomCity(TEXAS_CITIES);
    } else {
      origin = getRandomCity(TEXAS_CITIES);
      do {
        dest = getRandomCity(TEXAS_CITIES);
      } while (dest.name === origin.name);
    }

    // Fetch real route from Mapbox
    console.log(`  Fetching route: ${origin.name} → ${dest.name}...`);
    const routeGeoJson = await fetchRoute(origin.lng, origin.lat, dest.lng, dest.lat);
    fetchedCount++;

    // Rate limit: Mapbox allows 300 requests/minute, but let's be safe
    if (fetchedCount % 5 === 0) {
      await delay(200);
    }

    // Assign truck for in-transit orders (not CONFIRMED - those await pickup)
    const assignedTruck = config.status !== "CONFIRMED" && trucks.length > 0
      ? trucks[fetchedCount % trucks.length]
      : null;

    // Get product info with value and description
    const product = getRandomProduct();

    orders.push({
      id: config.id,
      itemName: product.itemName,
      description: product.description,
      orderValue: product.orderValue,
      status: config.status,
      carrier: getRandomCarrier(parseInt(config.id.split("-")[1])),
      truckId: assignedTruck?.id ?? null,
      origin: origin.name,
      destination: dest.name,
      startLat: origin.lat,
      startLng: origin.lng,
      endLat: dest.lat,
      endLng: dest.lng,
      riskScore: config.riskScore,
      routeGeoJson: routeGeoJson,
      progress: config.status === "CONFIRMED" ? 0 : 20 + Math.floor(Math.random() * 60), // 20-80% progress
    });
  }

  // Insert all orders
  for (const order of orders) {
    await prisma.order.create({
      data: order as Parameters<typeof prisma.order.create>[0]["data"],
    });
  }

  const withRoutes = orders.filter(o => o.routeGeoJson !== null).length;
  const withTrucks = orders.filter(o => o.truckId !== null).length;

  console.log(`\n✅ Database populated successfully!`);
  console.log(`\n🚛 Fleet: ${trucks.length} trucks (Samsara)`);
  console.log(`📦 Orders: ${orders.length} routes (Manhattan TMS)`);
  console.log(`   - ${withRoutes} with real Mapbox directions`);
  console.log(`   - ${withTrucks} assigned to trucks`);
  console.log(`   - ${orders.filter(o => o.status === "IN_TRANSIT").length} In Transit`);
  console.log(`   - ${orders.filter(o => o.status === "CONFIRMED").length} Confirmed (awaiting pickup)`);
  console.log(`   - ${orders.filter(o => o.riskScore >= 40).length} At Risk (orange)`);
  console.log(`   - 0 Critical (red only appears during incidents)`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
