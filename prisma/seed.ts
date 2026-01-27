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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
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

// Product categories with REALISTIC cost/sell pricing per pallet
// Based on actual food distribution industry data:
// - Sysco's gross margin is typically 18-20%
// - Fresh items have lower margins (spoilage risk)
// - Dry goods and beverages have higher margins
const PRODUCT_CATEGORIES = [
  { name: "Fresh Produce", baseCost: 1200, margin: 1.12, description: "Temperature-controlled fresh vegetables and fruits" }, // 12% margin
  { name: "Frozen Seafood", baseCost: 5500, margin: 1.18, description: "Premium frozen seafood requiring -18°C storage" }, // 18% margin
  { name: "Dairy Products", baseCost: 2200, margin: 1.14, description: "Refrigerated dairy including milk, cheese, and yogurt" }, // 14% margin
  { name: "Beef Products", baseCost: 8500, margin: 1.16, description: "USDA Prime and Choice beef cuts" }, // 16% margin
  { name: "Poultry", baseCost: 3200, margin: 1.15, description: "Fresh and frozen chicken and turkey products" }, // 15% margin
  { name: "Bakery Items", baseCost: 950, margin: 1.22, description: "Fresh-baked bread, pastries, and desserts" }, // 22% margin
  { name: "Beverages", baseCost: 1800, margin: 1.28, description: "Soft drinks, juices, and specialty beverages" }, // 28% margin
  { name: "Dry Goods", baseCost: 1100, margin: 1.24, description: "Shelf-stable pantry items and canned goods" }, // 24% margin
];

// High-value buyer accounts (restaurants and clients)
const BUYER_DATA = [
  { name: "Ruth's Chris Steakhouse - Dallas", segment: "Fine Dining", trustScore: 98, totalSpend: 1200000 },
  { name: "Omni Hotel Dallas", segment: "Hospitality", trustScore: 92, totalSpend: 850000 },
  { name: "The Capital Grille", segment: "Fine Dining", trustScore: 96, totalSpend: 950000 },
  { name: "Whole Foods Market - Texas", segment: "Retail", trustScore: 99, totalSpend: 4500000 },
  { name: "Pappas Bros Steakhouse", segment: "Fine Dining", trustScore: 94, totalSpend: 780000 },
  { name: "Marriott Downtown Dallas", segment: "Hospitality", trustScore: 91, totalSpend: 620000 },
  { name: "Perry's Steakhouse", segment: "Fine Dining", trustScore: 95, totalSpend: 540000 },
  { name: "Four Seasons Resort", segment: "Hospitality", trustScore: 97, totalSpend: 1100000 },
  { name: "HEB Grocery", segment: "Retail", trustScore: 98, totalSpend: 3200000 },
  { name: "Fogo de Chão", segment: "Fine Dining", trustScore: 93, totalSpend: 680000 },
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

// Roadside Assistance Network - Strategic locations across Texas
// Placed along major interstates: I-10, I-20, I-35, I-45, I-40, I-27
const SERVICE_CENTERS = [
  // === MAJOR TRUCK STOPS (24/7 Full Service) ===
  // I-10 Corridor (El Paso to Houston)
  { id: "SVC-ELP-001", name: "Pilot Travel Center - El Paso", type: "TRUCK_STOP", lat: 31.7940, lng: -106.4290, address: "8500 Gateway Blvd E, El Paso, TX", phone: "(915) 598-3400", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 60, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-VHN-001", name: "Love's Travel Stop - Van Horn", type: "TRUCK_STOP", lat: 31.0400, lng: -104.8300, address: "1001 W Broadway St, Van Horn, TX", phone: "(432) 283-2067", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 80, rating: 4.4, contractTier: "PREFERRED" },
  { id: "SVC-FTK-001", name: "TA Travel Center - Fort Stockton", type: "TRUCK_STOP", lat: 30.8840, lng: -102.8790, address: "1500 W Interstate 10, Fort Stockton, TX", phone: "(432) 336-5600", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 70, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-OZN-001", name: "Pilot Flying J - Ozona", type: "TRUCK_STOP", lat: 30.7100, lng: -101.2000, address: "1205 Sheffield Rd, Ozona, TX", phone: "(325) 392-2611", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 30, coverageRadius: 65, rating: 4.3, contractTier: "STANDARD" },
  { id: "SVC-JCT-001", name: "Love's Travel Stop - Junction", type: "TRUCK_STOP", lat: 30.4890, lng: -99.7720, address: "2040 N Main St, Junction, TX", phone: "(325) 446-2100", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 30, coverageRadius: 55, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-KRV-001", name: "TA Petro - Kerrville", type: "TRUCK_STOP", lat: 30.0470, lng: -99.1400, address: "1875 Sidney Baker St, Kerrville, TX", phone: "(830) 896-5500", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 50, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-SEG-001", name: "Pilot Travel Center - Seguin", type: "TRUCK_STOP", lat: 29.5710, lng: -97.9400, address: "2875 N Hwy 46, Seguin, TX", phone: "(830) 379-4700", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 45, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-CLB-001", name: "Love's Travel Stop - Columbus", type: "TRUCK_STOP", lat: 29.7070, lng: -96.5400, address: "2341 Hwy 71 S, Columbus, TX", phone: "(979) 732-5550", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 50, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-KTY-001", name: "Pilot Flying J - Katy", type: "TRUCK_STOP", lat: 29.7857, lng: -95.8240, address: "27777 Katy Fwy, Katy, TX", phone: "(281) 392-3000", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 40, rating: 4.7, contractTier: "PREFERRED" },
  { id: "SVC-BMT-001", name: "Love's Travel Stop - Beaumont", type: "TRUCK_STOP", lat: 30.0860, lng: -94.1010, address: "3850 I-10 S, Beaumont, TX", phone: "(409) 842-3600", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 50, rating: 4.5, contractTier: "PREFERRED" },

  // I-20 Corridor (Midland to Dallas)
  { id: "SVC-MDL-001", name: "Pilot Travel Center - Midland", type: "TRUCK_STOP", lat: 32.0230, lng: -102.1100, address: "4701 W Wall St, Midland, TX", phone: "(432) 694-4000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 60, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-ODS-001", name: "Love's Travel Stop - Odessa", type: "TRUCK_STOP", lat: 31.8600, lng: -102.3680, address: "8200 W University Blvd, Odessa, TX", phone: "(432) 362-8000", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 55, rating: 4.4, contractTier: "PREFERRED" },
  { id: "SVC-BGS-001", name: "TA Travel Center - Big Spring", type: "TRUCK_STOP", lat: 32.2540, lng: -101.4780, address: "704 W I-20, Big Spring, TX", phone: "(432) 264-4444", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 65, rating: 4.3, contractTier: "STANDARD" },
  { id: "SVC-SWT-001", name: "Pilot Flying J - Sweetwater", type: "TRUCK_STOP", lat: 32.4710, lng: -100.4060, address: "401 NW Georgia Ave, Sweetwater, TX", phone: "(325) 236-6000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 55, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-ABL-001", name: "Love's Travel Stop - Abilene", type: "TRUCK_STOP", lat: 32.4460, lng: -99.8200, address: "4302 S 1st St, Abilene, TX", phone: "(325) 692-8600", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 50, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-RNG-001", name: "TA Petro - Ranger", type: "TRUCK_STOP", lat: 32.4700, lng: -98.6790, address: "1201 Main St, Ranger, TX", phone: "(254) 647-3000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 30, coverageRadius: 45, rating: 4.2, contractTier: "STANDARD" },
  { id: "SVC-WTH-001", name: "Pilot Travel Center - Weatherford", type: "TRUCK_STOP", lat: 32.7590, lng: -97.7970, address: "200 Interstate 20 E, Weatherford, TX", phone: "(817) 596-8000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 40, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-TRL-001", name: "Love's Travel Stop - Terrell", type: "TRUCK_STOP", lat: 32.7350, lng: -96.2750, address: "1901 W Moore Ave, Terrell, TX", phone: "(972) 551-3900", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 45, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-TYL-001", name: "Pilot Flying J - Tyler", type: "TRUCK_STOP", lat: 32.3510, lng: -95.3010, address: "12815 State Hwy 64 W, Tyler, TX", phone: "(903) 561-3600", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 50, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-LGV-001", name: "Love's Travel Stop - Longview", type: "TRUCK_STOP", lat: 32.5010, lng: -94.7400, address: "3505 N Eastman Rd, Longview, TX", phone: "(903) 757-4500", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 55, rating: 4.5, contractTier: "PREFERRED" },

  // I-35 Corridor (Laredo to Dallas)
  { id: "SVC-LRD-001", name: "Pilot Travel Center - Laredo", type: "TRUCK_STOP", lat: 27.5060, lng: -99.5070, address: "6710 San Bernardo Ave, Laredo, TX", phone: "(956) 723-8000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 60, rating: 4.4, contractTier: "PREFERRED" },
  { id: "SVC-SAN-001", name: "Love's Travel Stop - San Antonio North", type: "TRUCK_STOP", lat: 29.5720, lng: -98.5250, address: "15335 N Interstate 35, San Antonio, TX", phone: "(210) 657-5500", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 45, rating: 4.7, contractTier: "PREFERRED" },
  { id: "SVC-NWB-001", name: "TA Travel Center - New Braunfels", type: "TRUCK_STOP", lat: 29.7030, lng: -98.1240, address: "1625 N Interstate 35, New Braunfels, TX", phone: "(830) 620-4800", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 40, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-SMC-001", name: "Pilot Flying J - San Marcos", type: "TRUCK_STOP", lat: 29.8830, lng: -97.9410, address: "4401 S Interstate 35, San Marcos, TX", phone: "(512) 392-4400", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 40, rating: 4.5, contractTier: "STANDARD" },
  { id: "SVC-AUS-001", name: "Love's Travel Stop - Austin South", type: "TRUCK_STOP", lat: 30.1470, lng: -97.7900, address: "9501 S Interstate 35, Austin, TX", phone: "(512) 280-3500", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 40, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-RRK-001", name: "TA Petro - Round Rock", type: "TRUCK_STOP", lat: 30.5170, lng: -97.6690, address: "3010 N Interstate 35, Round Rock, TX", phone: "(512) 388-7600", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 35, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-GEO-001", name: "Pilot Travel Center - Georgetown", type: "TRUCK_STOP", lat: 30.6320, lng: -97.6780, address: "200 Del Webb Blvd, Georgetown, TX", phone: "(512) 863-4500", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 40, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-TMP-001", name: "Love's Travel Stop - Temple", type: "TRUCK_STOP", lat: 31.0970, lng: -97.3430, address: "3501 S General Bruce Dr, Temple, TX", phone: "(254) 773-7000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 45, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-WAC-001", name: "Pilot Flying J - Waco", type: "TRUCK_STOP", lat: 31.5380, lng: -97.1550, address: "4401 S Jack Kultgen Expwy, Waco, TX", phone: "(254) 662-8400", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 50, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-HBD-001", name: "TA Travel Center - Hillsboro", type: "TRUCK_STOP", lat: 32.0110, lng: -97.1300, address: "1001 S Interstate 35 E, Hillsboro, TX", phone: "(254) 582-5800", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 40, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-DEN-001", name: "Love's Travel Stop - Denton", type: "TRUCK_STOP", lat: 33.2100, lng: -97.1330, address: "4800 S Interstate 35 E, Denton, TX", phone: "(940) 591-1900", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 40, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-GNV-001", name: "Pilot Travel Center - Gainesville", type: "TRUCK_STOP", lat: 33.6260, lng: -97.1330, address: "1616 N Interstate 35, Gainesville, TX", phone: "(940) 665-9500", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 50, rating: 4.4, contractTier: "STANDARD" },

  // I-45 Corridor (Houston to Dallas)
  { id: "SVC-HOU-001", name: "Love's Travel Stop - Houston North", type: "TRUCK_STOP", lat: 29.9680, lng: -95.4180, address: "16603 N Freeway, Houston, TX", phone: "(281) 873-4500", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 40, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-CNR-001", name: "Pilot Flying J - Conroe", type: "TRUCK_STOP", lat: 30.3120, lng: -95.4560, address: "16951 Interstate 45 S, Conroe, TX", phone: "(936) 788-5000", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 45, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-HNT-001", name: "TA Travel Center - Huntsville", type: "TRUCK_STOP", lat: 30.7240, lng: -95.5500, address: "150 Interstate 45 S, Huntsville, TX", phone: "(936) 295-8200", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 50, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-MDS-001", name: "Love's Travel Stop - Madisonville", type: "TRUCK_STOP", lat: 30.9500, lng: -95.9110, address: "600 Interstate 45 S, Madisonville, TX", phone: "(936) 348-6600", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 55, rating: 4.3, contractTier: "STANDARD" },
  { id: "SVC-BUF-001", name: "Pilot Travel Center - Buffalo", type: "TRUCK_STOP", lat: 31.4630, lng: -96.0580, address: "106 N Main St, Buffalo, TX", phone: "(903) 322-4700", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 30, coverageRadius: 50, rating: 4.2, contractTier: "STANDARD" },
  { id: "SVC-COR-001", name: "Love's Travel Stop - Corsicana", type: "TRUCK_STOP", lat: 32.0950, lng: -96.4680, address: "3701 W State Hwy 31, Corsicana, TX", phone: "(903) 872-8600", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 45, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-ENS-001", name: "TA Petro - Ennis", type: "TRUCK_STOP", lat: 32.3290, lng: -96.6240, address: "2400 N Interstate 45, Ennis, TX", phone: "(972) 875-7900", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 40, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-DLS-001", name: "Pilot Flying J - Dallas South", type: "TRUCK_STOP", lat: 32.6530, lng: -96.7780, address: "8787 S Interstate 45, Dallas, TX", phone: "(214) 371-8000", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 15, coverageRadius: 35, rating: 4.7, contractTier: "PREFERRED" },

  // I-40/I-27 Panhandle Corridor
  { id: "SVC-AMA-001", name: "Love's Travel Stop - Amarillo West", type: "TRUCK_STOP", lat: 35.1970, lng: -101.9120, address: "3301 S Lakeside Dr, Amarillo, TX", phone: "(806) 351-1900", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 65, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-AMA-002", name: "Pilot Flying J - Amarillo East", type: "TRUCK_STOP", lat: 35.2050, lng: -101.7840, address: "1801 Ross St, Amarillo, TX", phone: "(806) 373-4500", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 60, rating: 4.4, contractTier: "PREFERRED" },
  { id: "SVC-LBK-001", name: "TA Travel Center - Lubbock", type: "TRUCK_STOP", lat: 33.5320, lng: -101.8910, address: "5610 Avenue A, Lubbock, TX", phone: "(806) 763-8600", services: ["TOWING", "TIRE", "MECHANICAL", "REFRIGERATION", "FUEL"], is24Hours: true, avgResponseMins: 20, coverageRadius: 70, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-PLV-001", name: "Love's Travel Stop - Plainview", type: "TRUCK_STOP", lat: 34.1850, lng: -101.7060, address: "3201 N Interstate 27, Plainview, TX", phone: "(806) 293-2700", services: ["TOWING", "TIRE", "MECHANICAL", "FUEL"], is24Hours: true, avgResponseMins: 25, coverageRadius: 55, rating: 4.3, contractTier: "STANDARD" },

  // === DEDICATED REPAIR SHOPS ===
  // Major metro areas with specialized services
  { id: "SVC-DFW-REP1", name: "Lone Star Truck & Trailer Repair", type: "REPAIR_SHOP", lat: 32.8140, lng: -96.8700, address: "11234 Harry Hines Blvd, Dallas, TX", phone: "(214) 631-5500", services: ["MECHANICAL", "ELECTRICAL", "BRAKES", "TRANSMISSION"], is24Hours: false, avgResponseMins: 45, coverageRadius: 35, rating: 4.7, contractTier: "PREFERRED" },
  { id: "SVC-DFW-REP2", name: "North Texas Diesel Services", type: "REPAIR_SHOP", lat: 32.9430, lng: -97.0800, address: "2500 Meacham Blvd, Fort Worth, TX", phone: "(817) 625-8800", services: ["MECHANICAL", "DIESEL", "TRANSMISSION", "EXHAUST"], is24Hours: false, avgResponseMins: 50, coverageRadius: 40, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-HOU-REP1", name: "Gulf Coast Heavy Truck Repair", type: "REPAIR_SHOP", lat: 29.7830, lng: -95.2560, address: "7890 East Fwy, Houston, TX", phone: "(713) 453-7800", services: ["MECHANICAL", "DIESEL", "ELECTRICAL", "HYDRAULICS"], is24Hours: false, avgResponseMins: 40, coverageRadius: 35, rating: 4.8, contractTier: "PREFERRED" },
  { id: "SVC-HOU-REP2", name: "Bayou City Truck Service", type: "REPAIR_SHOP", lat: 29.8290, lng: -95.5100, address: "4521 W 34th St, Houston, TX", phone: "(713) 688-9200", services: ["MECHANICAL", "BRAKES", "SUSPENSION", "STEERING"], is24Hours: false, avgResponseMins: 45, coverageRadius: 30, rating: 4.5, contractTier: "STANDARD" },
  { id: "SVC-SAT-REP1", name: "Alamo Truck Repair Center", type: "REPAIR_SHOP", lat: 29.4580, lng: -98.5260, address: "6400 N Pan Am Expwy, San Antonio, TX", phone: "(210) 224-6700", services: ["MECHANICAL", "DIESEL", "ELECTRICAL", "BRAKES"], is24Hours: false, avgResponseMins: 45, coverageRadius: 35, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-AUS-REP1", name: "Capital City Diesel & Truck", type: "REPAIR_SHOP", lat: 30.2510, lng: -97.7130, address: "8901 Research Blvd, Austin, TX", phone: "(512) 454-8900", services: ["MECHANICAL", "DIESEL", "TRANSMISSION", "ELECTRICAL"], is24Hours: false, avgResponseMins: 45, coverageRadius: 35, rating: 4.7, contractTier: "PREFERRED" },

  // === MOBILE MECHANIC SERVICES ===
  // On-site repair specialists
  { id: "SVC-MOB-DFW1", name: "On-The-Road Fleet Services DFW", type: "MOBILE_MECHANIC", lat: 32.7510, lng: -97.3330, address: "Mobile - Fort Worth Metro", phone: "(817) 555-ROAD", services: ["MECHANICAL", "TIRE", "ELECTRICAL", "BRAKES"], is24Hours: true, avgResponseMins: 35, coverageRadius: 60, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-MOB-HOU1", name: "Highway Heroes Mobile Repair", type: "MOBILE_MECHANIC", lat: 29.7604, lng: -95.3698, address: "Mobile - Houston Metro", phone: "(832) 555-HERO", services: ["MECHANICAL", "TIRE", "ELECTRICAL", "DIESEL"], is24Hours: true, avgResponseMins: 40, coverageRadius: 55, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-MOB-SAT1", name: "San Antonio Road Rescue", type: "MOBILE_MECHANIC", lat: 29.4241, lng: -98.4936, address: "Mobile - San Antonio Metro", phone: "(210) 555-HELP", services: ["MECHANICAL", "TIRE", "ELECTRICAL", "BRAKES"], is24Hours: true, avgResponseMins: 40, coverageRadius: 50, rating: 4.4, contractTier: "STANDARD" },
  { id: "SVC-MOB-I10W", name: "West Texas Mobile Truck Repair", type: "MOBILE_MECHANIC", lat: 31.4500, lng: -103.5000, address: "Mobile - I-10 West Corridor", phone: "(432) 555-I10W", services: ["MECHANICAL", "TIRE", "DIESEL", "ELECTRICAL"], is24Hours: true, avgResponseMins: 55, coverageRadius: 100, rating: 4.3, contractTier: "STANDARD" },
  { id: "SVC-MOB-I20W", name: "Permian Basin Mobile Services", type: "MOBILE_MECHANIC", lat: 31.9970, lng: -102.0780, address: "Mobile - Midland/Odessa", phone: "(432) 555-PERM", services: ["MECHANICAL", "TIRE", "DIESEL", "HYDRAULICS"], is24Hours: true, avgResponseMins: 45, coverageRadius: 75, rating: 4.5, contractTier: "PREFERRED" },

  // === TOWING SERVICES ===
  // Heavy-duty towing companies
  { id: "SVC-TOW-DFW1", name: "Metroplex Heavy Haul Towing", type: "TOWING_SERVICE", lat: 32.8990, lng: -97.0380, address: "1500 Industrial Blvd, Irving, TX", phone: "(214) 555-HAUL", services: ["TOWING", "RECOVERY", "HEAVY_DUTY"], is24Hours: true, avgResponseMins: 30, coverageRadius: 50, rating: 4.7, contractTier: "PREFERRED" },
  { id: "SVC-TOW-HOU1", name: "Houston Heavy Tow & Recovery", type: "TOWING_SERVICE", lat: 29.8510, lng: -95.3900, address: "4200 N Main St, Houston, TX", phone: "(713) 555-TOW1", services: ["TOWING", "RECOVERY", "HEAVY_DUTY", "WINCH"], is24Hours: true, avgResponseMins: 35, coverageRadius: 45, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-TOW-SAT1", name: "South Texas Big Rig Towing", type: "TOWING_SERVICE", lat: 29.3820, lng: -98.5500, address: "7300 S Zarzamora St, San Antonio, TX", phone: "(210) 555-BIGT", services: ["TOWING", "RECOVERY", "HEAVY_DUTY"], is24Hours: true, avgResponseMins: 35, coverageRadius: 50, rating: 4.5, contractTier: "PREFERRED" },
  { id: "SVC-TOW-AUS1", name: "Austin Area Heavy Recovery", type: "TOWING_SERVICE", lat: 30.1990, lng: -97.7380, address: "5600 S Congress Ave, Austin, TX", phone: "(512) 555-RECV", services: ["TOWING", "RECOVERY", "HEAVY_DUTY", "ROLLBACK"], is24Hours: true, avgResponseMins: 35, coverageRadius: 45, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-TOW-I35S", name: "Border Corridor Towing", type: "TOWING_SERVICE", lat: 28.4500, lng: -99.2400, address: "Mobile - I-35 South", phone: "(956) 555-BRDR", services: ["TOWING", "RECOVERY", "HEAVY_DUTY"], is24Hours: true, avgResponseMins: 45, coverageRadius: 70, rating: 4.3, contractTier: "STANDARD" },

  // === TIRE CENTERS ===
  // Specialized tire services
  { id: "SVC-TIR-DFW1", name: "DFW Commercial Tire Center", type: "TIRE_CENTER", lat: 32.7680, lng: -96.8590, address: "3200 Irving Blvd, Dallas, TX", phone: "(214) 555-TIRE", services: ["TIRE", "ALIGNMENT", "BALANCING"], is24Hours: false, avgResponseMins: 30, coverageRadius: 40, rating: 4.8, contractTier: "PREFERRED" },
  { id: "SVC-TIR-HOU1", name: "Houston Fleet Tire Service", type: "TIRE_CENTER", lat: 29.7710, lng: -95.2880, address: "9100 East Fwy, Houston, TX", phone: "(713) 555-FLTT", services: ["TIRE", "ALIGNMENT", "BALANCING", "24HR_MOBILE"], is24Hours: true, avgResponseMins: 35, coverageRadius: 45, rating: 4.7, contractTier: "PREFERRED" },
  { id: "SVC-TIR-SAT1", name: "Lone Star Tire & Wheel", type: "TIRE_CENTER", lat: 29.4910, lng: -98.4390, address: "2800 NE Loop 410, San Antonio, TX", phone: "(210) 555-LSTR", services: ["TIRE", "ALIGNMENT", "BALANCING"], is24Hours: false, avgResponseMins: 35, coverageRadius: 40, rating: 4.6, contractTier: "PREFERRED" },
  { id: "SVC-TIR-MOB1", name: "Highway Tire Express", type: "TIRE_CENTER", lat: 31.5500, lng: -97.1500, address: "Mobile - Central TX", phone: "(254) 555-EXPR", services: ["TIRE", "24HR_MOBILE"], is24Hours: true, avgResponseMins: 45, coverageRadius: 80, rating: 4.4, contractTier: "STANDARD" },

  // === REFRIGERATION SPECIALISTS ===
  // Reefer repair experts
  { id: "SVC-REF-DFW1", name: "Arctic Fleet Reefer Services", type: "REFRIGERATION", lat: 32.8650, lng: -96.9500, address: "1800 Lombardy Ln, Dallas, TX", phone: "(214) 555-COLD", services: ["REFRIGERATION", "REEFER_REPAIR", "DIAGNOSTICS"], is24Hours: true, avgResponseMins: 40, coverageRadius: 50, rating: 4.8, contractTier: "PREFERRED" },
  { id: "SVC-REF-HOU1", name: "Gulf Reefer Specialists", type: "REFRIGERATION", lat: 29.8030, lng: -95.3300, address: "6500 Airline Dr, Houston, TX", phone: "(713) 555-REEF", services: ["REFRIGERATION", "REEFER_REPAIR", "CARRIER", "THERMO_KING"], is24Hours: true, avgResponseMins: 35, coverageRadius: 45, rating: 4.9, contractTier: "PREFERRED" },
  { id: "SVC-REF-SAT1", name: "South Texas Cold Chain Repair", type: "REFRIGERATION", lat: 29.5200, lng: -98.4750, address: "4300 Rittiman Rd, San Antonio, TX", phone: "(210) 555-CCLD", services: ["REFRIGERATION", "REEFER_REPAIR", "DIAGNOSTICS"], is24Hours: true, avgResponseMins: 40, coverageRadius: 50, rating: 4.7, contractTier: "PREFERRED" },
  { id: "SVC-REF-MOB1", name: "Texas Reefer Road Service", type: "REFRIGERATION", lat: 30.2670, lng: -97.7430, address: "Mobile - Austin/San Antonio Corridor", phone: "(512) 555-RREF", services: ["REFRIGERATION", "REEFER_REPAIR", "24HR_MOBILE"], is24Hours: true, avgResponseMins: 50, coverageRadius: 70, rating: 4.5, contractTier: "STANDARD" },
];

// Route data returned from Mapbox
interface RouteData {
  coordinates: number[][] | null;
  distanceMeters: number; // Total route distance in meters
  durationSeconds: number; // Estimated travel time in seconds
}

// Fetch route from Mapbox Directions API (now returns distance/duration too)
async function fetchRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<RouteData> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=simplified&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch route: ${response.status}`);
      return { coordinates: null, distanceMeters: 0, durationSeconds: 0 };
    }

    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates,
        distanceMeters: route.distance, // in meters
        durationSeconds: route.duration, // in seconds
      };
    }
    return { coordinates: null, distanceMeters: 0, durationSeconds: 0 };
  } catch (error) {
    console.warn("Error fetching route:", error);
    return { coordinates: null, distanceMeters: 0, durationSeconds: 0 };
  }
}

function getRandomProduct() {
  const category = PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)];
  const pallets = Math.floor(Math.random() * 8) + 1;
  // Calculate financials based on pallets
  const valueMultiplier = 0.85 + Math.random() * 0.3; // 85%-115% of base
  const costPrice = Math.round(category.baseCost * pallets * valueMultiplier);
  // Note: sellPrice will be calculated in main loop AFTER we know logistics cost
  const internalBaseCost = Math.round(150 + Math.random() * 100); // $150-$250 fixed overhead per order

  return {
    itemName: `${category.name} (${pallets} Pallets)`,
    description: category.description,
    costPrice,
    internalBaseCost,
    pallets,
    margin: category.margin, // Pass margin so we can calculate sell price after logistics
  };
}

// Calculate realistic logistics cost based on distance and pallets
// Trucking industry avg: $2.50-$3.50 per mile (fuel, driver, maintenance)
function calculateLogisticsCost(distanceMeters: number, pallets: number): number {
  const distanceMiles = distanceMeters / 1609.34;
  const baseRatePerMile = 2.80 + Math.random() * 0.70; // $2.80-$3.50/mile
  const palletSurcharge = pallets * 15; // $15 handling per pallet
  return Math.round(distanceMiles * baseRatePerMile + palletSurcharge);
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
  await prisma.buyer.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.serviceCenter.deleteMany({});

  // Create warehouses (Real Sysco Texas locations)
  console.log("🏭 Creating Sysco warehouses...");
  const warehouseData = [
    {
      id: "WH-DAL-001",
      name: "Sysco North Texas",
      type: "BROADLINE_HUB",
      address: "800 Trinity Dr, Lewisville, TX 75056",
      lat: 33.0645,
      lng: -96.9380,
      description: "Primary distribution hub for DFW Metroplex",
    },
    {
      id: "WH-HOU-001",
      name: "Sysco Houston",
      type: "BROADLINE_HUB",
      address: "10710 Greens Crossing Blvd, Houston, TX 77038",
      lat: 29.9485,
      lng: -95.4290,
      description: "Largest Southern hub servicing coastal regions",
    },
    {
      id: "WH-CTX-001",
      name: "Sysco Central Texas",
      type: "BROADLINE_HUB",
      address: "1260 Schwab Rd, New Braunfels, TX 78132",
      lat: 29.7405,
      lng: -98.1565,
      description: "Strategic corridor hub servicing San Antonio/Austin",
    },
    {
      id: "WH-WTX-001",
      name: "Sysco West Texas",
      type: "REGIONAL_HUB",
      address: "714 2nd Pl, Lubbock, TX 79401",
      lat: 33.5866,
      lng: -101.8350,
      description: "Western Texas plains transfer point",
    },
    {
      id: "WH-ETX-001",
      name: "Sysco East Texas",
      type: "REGIONAL_HUB",
      address: "4577 Estes Pkwy, Longview, TX 75603",
      lat: 32.4485,
      lng: -94.7290,
      description: "Eastern node connecting Louisiana markets",
    },
  ];

  for (const warehouse of warehouseData) {
    await prisma.warehouse.create({ data: warehouse });
  }
  console.log(`   Created ${warehouseData.length} warehouse locations\n`);

  // Create roadside assistance network
  console.log("🔧 Creating roadside assistance network...");
  for (const center of SERVICE_CENTERS) {
    await prisma.serviceCenter.create({
      data: {
        id: center.id,
        name: center.name,
        type: center.type as "TRUCK_STOP" | "REPAIR_SHOP" | "MOBILE_MECHANIC" | "TOWING_SERVICE" | "TIRE_CENTER" | "REFRIGERATION",
        address: center.address,
        lat: center.lat,
        lng: center.lng,
        phone: center.phone,
        services: center.services,
        is24Hours: center.is24Hours,
        avgResponseMins: center.avgResponseMins,
        coverageRadius: center.coverageRadius,
        status: "AVAILABLE",
        rating: center.rating,
        contractTier: center.contractTier,
      },
    });
  }
  const truckStops = SERVICE_CENTERS.filter(c => c.type === "TRUCK_STOP").length;
  const repairShops = SERVICE_CENTERS.filter(c => c.type === "REPAIR_SHOP").length;
  const mobileMechanics = SERVICE_CENTERS.filter(c => c.type === "MOBILE_MECHANIC").length;
  const towingServices = SERVICE_CENTERS.filter(c => c.type === "TOWING_SERVICE").length;
  const tireCenters = SERVICE_CENTERS.filter(c => c.type === "TIRE_CENTER").length;
  const reeferSpecialists = SERVICE_CENTERS.filter(c => c.type === "REFRIGERATION").length;
  console.log(`   Created ${SERVICE_CENTERS.length} service centers:`);
  console.log(`      - ${truckStops} Truck Stops (24/7)`);
  console.log(`      - ${repairShops} Repair Shops`);
  console.log(`      - ${mobileMechanics} Mobile Mechanics`);
  console.log(`      - ${towingServices} Towing Services`);
  console.log(`      - ${tireCenters} Tire Centers`);
  console.log(`      - ${reeferSpecialists} Refrigeration Specialists\n`);

  // Create buyer accounts (restaurants and clients)
  console.log("🏢 Creating buyer accounts...");
  const buyers: Array<{ id: string; name: string; segment: string }> = [];
  for (const buyerData of BUYER_DATA) {
    const buyer = await prisma.buyer.create({
      data: buyerData,
    });
    buyers.push({ id: buyer.id, name: buyer.name, segment: buyer.segment });
  }
  console.log(`   Created ${buyers.length} buyer accounts\n`);

  // Create the Samsara fleet (210 trucks - 3 per route × 70 routes)
  console.log("🚛 Creating Samsara fleet...");
  const trucks: Array<{ id: string; driverName: string; vehicleType: typeof VEHICLE_TYPES[number] }> = [];

  for (let i = 0; i < 210; i++) {
    const truckId = `TRK-${800 + i}`;
    const truck = {
      id: truckId,
      driverName: DRIVER_NAMES[i % DRIVER_NAMES.length], // Cycle through driver names
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
    distanceMeters: number;
    durationSeconds: number;
    progress: number;
    departedAt: Date | null;
    estimatedArrival: Date | null;
    actualArrival: Date | null;
    costPrice: number;
    sellPrice: number;
    internalBaseCost: number;
    actualLogisticsCost: number;
    buyerIds?: string[];
  }> = [];

  // Base time for calculations (current time)
  const now = new Date();

  // All cities for route generation
  const ALL_CITIES = [...TEXAS_CITIES, ...REGIONAL_CITIES];

  // Generate 70 unique routes, each will have 3 trucks
  console.log("📍 Generating 70 unique routes with 3 trucks each (210 total orders)...\n");

  // Pre-generate 70 unique origin/destination pairs
  const routePairs: Array<{ origin: typeof TEXAS_CITIES[0]; dest: typeof TEXAS_CITIES[0] }> = [];
  const usedPairs = new Set<string>();

  while (routePairs.length < 70) {
    const origin = ALL_CITIES[Math.floor(Math.random() * ALL_CITIES.length)];
    const dest = ALL_CITIES[Math.floor(Math.random() * ALL_CITIES.length)];
    const pairKey = `${origin.name}-${dest.name}`;
    const reversePairKey = `${dest.name}-${origin.name}`;

    // Avoid same origin/destination and duplicates
    if (origin.name !== dest.name && !usedPairs.has(pairKey) && !usedPairs.has(reversePairKey)) {
      routePairs.push({ origin, dest });
      usedPairs.add(pairKey);
    }
  }

  let truckIndex = 0;
  let orderIndex = 0;

  for (let routeIdx = 0; routeIdx < 70; routeIdx++) {
    const { origin, dest } = routePairs[routeIdx];

    // Fetch real route from Mapbox
    console.log(`  [${routeIdx + 1}/70] Fetching route: ${origin.name} → ${dest.name}...`);
    const routeData = await fetchRoute(origin.lng, origin.lat, dest.lng, dest.lat);

    // Rate limit: Mapbox allows 300 requests/minute
    if ((routeIdx + 1) % 10 === 0) {
      await delay(300);
    }

    const durationMs = routeData.durationSeconds * 1000;
    const durationHours = routeData.durationSeconds / 3600;
    const distanceMiles = Math.round(routeData.distanceMeters / 1609.34);

    // Create 3 orders for this route with different trucks and progress
    // Progress positions: ~20%, ~50%, ~80% along the route
    const progressValues = [15 + Math.random() * 15, 45 + Math.random() * 15, 75 + Math.random() * 15];

    for (let truckOnRoute = 0; truckOnRoute < 3; truckOnRoute++) {
      const assignedTruck = trucks[truckIndex];
      truckIndex++;

      // Get product info
      const product = getRandomProduct();

      // Calculate logistics cost based on actual route distance
      const actualLogisticsCost = calculateLogisticsCost(routeData.distanceMeters, product.pallets);

      // Calculate sell price to ensure profitability
      const totalCost = product.costPrice + actualLogisticsCost + product.internalBaseCost;
      const sellPrice = Math.round(totalCost * product.margin);

      // Progress for this truck (spread across the route)
      const progress = Math.round(progressValues[truckOnRoute]);

      // Calculate timing based on progress
      const elapsedMs = (progress / 100) * durationMs;
      const departedAt = new Date(now.getTime() - elapsedMs);
      const estimatedArrival = new Date(departedAt.getTime() + durationMs);

      // Risk score - mostly green, some orange
      let riskScore = Math.floor(Math.random() * 25); // 0-24 (green)
      if (Math.random() < 0.05) {
        riskScore = 45 + Math.floor(Math.random() * 25); // 5% chance of orange (45-69)
      }

      // Assign random buyers (1-3 per order)
      const numBuyers = 1 + Math.floor(Math.random() * 3);
      const shuffledBuyers = [...buyers].sort(() => Math.random() - 0.5);
      const orderBuyerIds = shuffledBuyers.slice(0, numBuyers).map(b => b.id);

      orders.push({
        id: `ORD-${8000 + orderIndex}`,
        itemName: product.itemName,
        description: product.description,
        orderValue: sellPrice,
        status: "IN_TRANSIT",
        carrier: getRandomCarrier(orderIndex),
        truckId: assignedTruck.id,
        origin: origin.name,
        destination: dest.name,
        startLat: origin.lat,
        startLng: origin.lng,
        endLat: dest.lat,
        endLng: dest.lng,
        riskScore,
        routeGeoJson: routeData.coordinates,
        distanceMeters: routeData.distanceMeters,
        durationSeconds: routeData.durationSeconds,
        progress,
        departedAt,
        estimatedArrival,
        actualArrival: null,
        costPrice: product.costPrice,
        sellPrice,
        internalBaseCost: product.internalBaseCost,
        actualLogisticsCost,
        buyerIds: orderBuyerIds,
      });

      orderIndex++;
    }

    console.log(`    → ${distanceMiles} mi, ${durationHours.toFixed(1)}h drive, 3 trucks placed`);
  }

  // Insert all orders with buyer connections
  for (const order of orders) {
    const { buyerIds, ...orderData } = order;
    await prisma.order.create({
      data: {
        ...orderData,
        buyers: buyerIds?.length ? {
          connect: buyerIds.map(id => ({ id })),
        } : undefined,
      } as Parameters<typeof prisma.order.create>[0]["data"],
    });
  }

  const withRoutes = orders.filter(o => o.routeGeoJson !== null).length;
  const withTrucks = orders.filter(o => o.truckId !== null).length;
  const totalProductCost = orders.reduce((sum, o) => sum + o.costPrice, 0);
  const totalLogistics = orders.reduce((sum, o) => sum + o.actualLogisticsCost, 0);
  const totalOverhead = orders.reduce((sum, o) => sum + o.internalBaseCost, 0);
  const totalCost = totalProductCost + totalLogistics + totalOverhead;
  const totalRevenue = orders.reduce((sum, o) => sum + o.sellPrice, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgDistance = orders.reduce((sum, o) => sum + o.distanceMeters, 0) / orders.length / 1609.34;
  const avgDuration = orders.reduce((sum, o) => sum + o.durationSeconds, 0) / orders.length / 3600;

  console.log(`\n✅ Database populated successfully!`);
  console.log(`\n🏭 Warehouses: ${warehouseData.length} facilities`);
  console.log(`   - ${warehouseData.filter(w => w.type === "BROADLINE_HUB").length} Broadline Hubs`);
  console.log(`   - ${warehouseData.filter(w => w.type === "REGIONAL_HUB").length} Regional Hubs`);
  console.log(`\n🔧 Service Centers: ${SERVICE_CENTERS.length} locations`);
  console.log(`   - ${truckStops} Truck Stops (24/7 full service)`);
  console.log(`   - ${repairShops} Dedicated Repair Shops`);
  console.log(`   - ${mobileMechanics} Mobile Mechanics (on-site)`);
  console.log(`   - ${towingServices} Heavy-Duty Towing`);
  console.log(`   - ${tireCenters} Tire Specialists`);
  console.log(`   - ${reeferSpecialists} Refrigeration Specialists`);
  console.log(`\n🏢 Buyers: ${buyers.length} accounts`);
  console.log(`   - ${buyers.filter(b => b.segment === "Fine Dining").length} Fine Dining`);
  console.log(`   - ${buyers.filter(b => b.segment === "Hospitality").length} Hospitality`);
  console.log(`   - ${buyers.filter(b => b.segment === "Retail").length} Retail`);
  console.log(`\n🚛 Fleet: ${trucks.length} trucks (Samsara)`);
  console.log(`📦 Orders: ${orders.length} routes (Manhattan TMS)`);
  console.log(`   - ${withRoutes} with real Mapbox directions`);
  console.log(`   - ${withTrucks} assigned to trucks`);
  console.log(`   - ${orders.filter(o => o.status === "IN_TRANSIT").length} In Transit`);
  console.log(`   - ${orders.filter(o => o.status === "CONFIRMED").length} Confirmed (awaiting pickup)`);
  console.log(`   - ${orders.filter(o => o.status === "DELIVERED").length} Delivered`);
  console.log(`   - ${orders.filter(o => o.riskScore >= 40 && o.riskScore < 80).length} At Risk (orange)`);
  console.log(`   - 0 Critical (red only appears during incidents)`);
  console.log(`\n📏 Route Analytics (from Mapbox):`);
  console.log(`   - Avg Distance: ${avgDistance.toFixed(0)} miles`);
  console.log(`   - Avg Duration: ${avgDuration.toFixed(1)} hours`);
  console.log(`\n💰 Financials (Always Profitable!):`);
  console.log(`   - Product Cost (COGS): $${totalProductCost.toLocaleString()}`);
  console.log(`   - Logistics Cost: $${totalLogistics.toLocaleString()}`);
  console.log(`   - Overhead: $${totalOverhead.toLocaleString()}`);
  console.log(`   - TOTAL COST: $${totalCost.toLocaleString()}`);
  console.log(`   - TOTAL REVENUE: $${totalRevenue.toLocaleString()}`);
  console.log(`   - NET PROFIT: $${totalProfit.toLocaleString()} (${((totalProfit / totalCost) * 100).toFixed(1)}% margin)`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
