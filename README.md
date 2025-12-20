# Sysco Supply Chain AI - Self-Healing Demo

A demonstration of AI agents autonomously resolving supply chain disruptions through real-time negotiation and orchestration.

## Overview

This application showcases a "Self-Healing Supply Chain" where AI agents don't just alert humans to problems—they actively solve them. When a critical shipment fails, agents negotiate with suppliers and coordinate fleet rerouting in real-time, all displayed through an interactive dashboard.

### Key Features

- **Real-time Fleet Map** - Interactive Mapbox visualization with 50+ trucks across Texas
- **Live Incident Tracking** - Radar-ping animations highlight critical orders
- **War Room Modal** - Command center for incident response with live agent coordination
- **68 Roadside Assistance Centers** - Strategic service network across major Texas interstates
- **Real-time Updates** - Pusher WebSocket integration for instant dashboard updates
- **Service Level Monitoring** - Live tracking against 99.9% SLA target

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Maps:** Mapbox GL JS with custom clustering and route visualization
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Pusher (WebSockets)
- **Deployment:** Railway / Vercel
- **AI Agents:** External agent platform integration via webhooks

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or Railway)
- Pusher account (free tier works)
- Mapbox account (for map tokens)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd sysco-supply-chain-demo
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and configure:

```bash
# Database (Railway PostgreSQL or local)
DATABASE_URL="postgresql://user:password@localhost:5432/sysco_demo"

# Pusher (get from https://dashboard.pusher.com)
PUSHER_APP_ID="your_app_id"
PUSHER_KEY="your_key"
PUSHER_SECRET="your_secret"
PUSHER_CLUSTER="us2"

NEXT_PUBLIC_PUSHER_KEY="your_key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# Mapbox (get from https://account.mapbox.com)
NEXT_PUBLIC_MAPBOX_TOKEN="your_mapbox_token"
MAPBOX_ACCESS_TOKEN="your_mapbox_token"
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with demo data (50+ orders, trucks, service centers)
npx prisma db seed
```

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## API Endpoints

### Trigger Incident

Trigger a new incident via API (useful for demos):

```bash
# Basic trigger (random order, default description)
curl -X POST http://localhost:3000/api/demo/trigger \
  -H "Content-Type: application/json" \
  -d '{}'

# With custom description
curl -X POST http://localhost:3000/api/demo/trigger \
  -H "Content-Type: application/json" \
  -d '{"description": "Refrigeration unit failed. Temperature rising above safe threshold."}'

# With specific order ID and description
curl -X POST http://localhost:3000/api/demo/trigger \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-001", "description": "Highway accident caused 3-hour delay."}'
```

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `orderId` | string (optional) | Specific order to create incident for |
| `description` | string (optional) | Custom incident description |

### Reset Demo

Reset the demo state (clears incidents, restores orders):

```bash
curl -X POST http://localhost:3000/api/demo/reset
```

### Webhook Endpoints

For AI agent platform integration:

**Agent Update:**
```bash
POST /api/webhooks/agent-update
Content-Type: application/json

{
  "run_id": "supplier-agent-12345",
  "stage": "supplier_negotiation",
  "status": "success",
  "reasoning": "Supplier confirmed 5 pallets available. Arranging pickup.",
  "ui_action": "update_map"
}
```

**Resolution:**
```bash
POST /api/webhooks/resolution
Content-Type: application/json

{
  "incident_id": "uuid",
  "summary": "Crisis resolved. Backup inventory secured from Texas Quality Meats."
}
```

## Data Model

### Orders
- 50+ active orders with real Mapbox routes across Texas
- Status: `PENDING`, `IN_TRANSIT`, `AT_RISK`, `DELIVERED`, `CANCELLED`
- Risk scoring (0-100) with visual indicators

### Trucks (Samsara Integration)
- Fleet of refrigerated, dry van, flatbed, and tanker trucks
- Real GPS coordinates along route paths
- Driver assignments with contact info

### Service Centers (Roadside Assistance Network)
68 locations across Texas interstates:
- **42 Truck Stops** - 24/7 full service (Pilot, Love's, TA)
- **6 Repair Shops** - Specialized mechanical services
- **5 Mobile Mechanics** - On-site repair
- **5 Towing Services** - Heavy-duty recovery
- **4 Tire Centers** - Tire specialists
- **4 Refrigeration Specialists** - Reefer repair

### Warehouses
5 Sysco distribution centers:
- Dallas (Broadline Hub)
- Houston (Broadline Hub)
- San Antonio (Regional)
- Austin (Regional)
- El Paso (Regional)

## Demo Script

### Phase 1: The Setup (Green Dashboard)

**Presenter:** "This is the Sysco Supply Chain Command Center. Everything is running smoothly—99.9% service level, 50+ orders confirmed and in transit across Texas."

### Phase 2: The Disruption

**Action:** Click "Trigger Demo" button or run:
```bash
curl -X POST http://localhost:3000/api/demo/trigger \
  -d '{"description": "Engine failure on I-35. Driver awaiting roadside assistance."}'
```

**Visual Changes:**
- Red radar-ping animation pulses on affected truck
- Alert banner appears with incident details
- Service level drops (turns red below 99.9%)
- Order status changes to "AT_RISK"

### Phase 3: The War Room

**Action:** Click on the red alert to open War Room Modal

**What You See:**
- Left side: Focused map showing incident truck, nearby service centers
- Right side: Two Agent Cards (Supplier & Driver coordination)
- Bottom: Live Reasoning Log with timestamps

### Phase 4: The Resolution

**Visual Payoff:**
- Agent cards animate through stages (IDLE → RUNNING → SUCCESS)
- Service level recovers to 99.9%+
- Order status updates to "RECOVERED"
- Email confirmation toast appears

**Presenter:** "Crisis resolved autonomously. This is the future of supply chain orchestration."

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js + React)                                 │
│  ├── Dashboard Page (real-time order/fleet view)           │
│  ├── FleetMap Component (Mapbox GL JS)                     │
│  └── WarRoomModal (incident command center)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Routes (Next.js)                                       │
│  ├── /api/demo/trigger - Create incidents                  │
│  ├── /api/demo/reset - Reset demo state                    │
│  ├── /api/orders - List/manage orders                      │
│  ├── /api/service-centers - Roadside network               │
│  └── /api/webhooks/* - Agent platform callbacks            │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│  PostgreSQL (Prisma)    │     │  Pusher (WebSockets)        │
│  ├── Orders             │     │  ├── demo-started event     │
│  ├── Trucks             │     │  ├── agent-update event     │
│  ├── Incidents          │     │  └── demo-complete event    │
│  ├── ServiceCenters     │     └─────────────────────────────┘
│  └── Warehouses         │
└─────────────────────────┘
```

## Deployment

### Railway

1. Create new project in Railway
2. Add PostgreSQL service
3. Connect GitHub repo
4. Add environment variables (DATABASE_URL auto-configured)
5. Add Pusher and Mapbox tokens
6. Deploy automatically on push

### Vercel

1. Import project to Vercel
2. Add PostgreSQL database (Neon, Supabase, etc.)
3. Configure environment variables
4. Deploy

## Troubleshooting

### Pusher not connecting

- Verify keys in `.env` match Pusher dashboard
- Check that `NEXT_PUBLIC_*` vars are set correctly
- Ensure Pusher cluster matches your account region

### Database connection errors

- Confirm PostgreSQL is running
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/db`
- Run `npx prisma generate` after schema changes
- Run `npx prisma db push` to sync schema

### Map not loading

- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Check Mapbox token has correct scopes enabled
- Ensure token hasn't exceeded usage limits

### Seed data issues

```bash
# Reset and reseed database
npx prisma db push --force-reset
npx prisma db seed
```

### Testing webhooks locally

Use ngrok to expose localhost:

```bash
ngrok http 3000
# Update agent webhooks to: https://xxx.ngrok.io/api/webhooks/...
```

## Development

### Key Files

```
├── app/
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── api/
│   │   ├── demo/trigger/       # Incident trigger API
│   │   ├── demo/reset/         # Reset API
│   │   └── webhooks/           # Agent callbacks
│   └── globals.css             # Animations (radar-ping, etc.)
├── components/
│   ├── FleetMap.tsx            # Mapbox fleet visualization
│   └── WarRoomModal.tsx        # Incident command center
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Demo data generator
└── lib/
    ├── prisma.ts               # Database client
    └── pusher-server.ts        # Pusher server instance
```

### Adding New Service Centers

Edit `prisma/seed.ts` and add entries to `SERVICE_CENTERS` array:

```typescript
{
  id: "SVC-XXX-001",
  name: "New Service Center",
  type: "TRUCK_STOP",
  lat: 32.0000,
  lng: -97.0000,
  address: "123 Main St, City, TX",
  phone: "(555) 123-4567",
  services: ["TOWING", "TIRE", "MECHANICAL"],
  is24Hours: true,
  avgResponseMins: 20,
  coverageRadius: 50,
  rating: 4.5,
  contractTier: "PREFERRED"
}
```

Then reseed: `npx prisma db seed`

## License

MIT

---

**Built for the future of autonomous supply chains**
