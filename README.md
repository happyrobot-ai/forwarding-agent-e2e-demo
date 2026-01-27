# DSV Air & Sea - AI Freight Forwarding Demo

A demonstration of AI-powered proactive communication for temperature-sensitive air freight, showcasing real-time monitoring and customer engagement.

## Overview

This application demonstrates DSV's intelligent freight forwarding platform with AI-powered email classification, temperature monitoring, and proactive customer communication. When temperature deviations are detected on sensitive cargo, AI agents autonomously reach out to customers with detailed information and resolution plans.

### Key Features

- **Email Classification Inbox** - AI-powered email triage with priority scoring and missing information detection
- **Live Shipment Dashboard** - Track temperature-sensitive air freight with real-time status updates
- **Global Air Freight Map** - Interactive Mapbox globe visualization with flight routes and temperature monitoring
- **Proactive Temperature Alerts** - Automatic detection and customer outreach when deviations occur
- **Real-time Updates** - Redis + SSE for instant dashboard updates without timeouts
- **Shipment Milestones** - Detailed timeline tracking with temperature data at each checkpoint
- **HappyRobot AI Integration** - Voice agent workflows for customer communication
- **DSV Branding** - Navy, white, and silver color scheme inspired by Apple design principles

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Maps:** Mapbox GL JS with globe projection for air freight routes
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Redis + Server-Sent Events (SSE)
- **Deployment:** Railway
- **AI Voice Agents:** HappyRobot platform integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Railway recommended)
- Redis instance (Railway recommended)
- Mapbox account (for map tokens)
- HappyRobot account (for AI voice workflows)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd dsv_demo
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env.local` and configure:

```bash
# Database (Railway PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# Redis (Railway Redis)
REDIS_URL="redis://default:password@host:port"

# HappyRobot Integration
HAPPYROBOT_WEBHOOK_URL="https://run.happyrobot.ai/..."
HAPPYROBOT_API_KEY="hr_api_xxxxxxxxxxxxx"
HAPPYROBOT_ORG_ID="org_xxxxxxxxxxxxx"
HAPPYROBOT_X_API_KEY="your_api_key_here"

# App URL (for callback URLs)
APP_URL="https://your-app.railway.app"
NEXT_PUBLIC_APP_URL="https://your-app.railway.app"

# Mapbox (get from https://account.mapbox.com)
NEXT_PUBLIC_MAPBOX_TOKEN="your_mapbox_token"
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

For detailed setup instructions, see [DSV_SETUP.md](./DSV_SETUP.md).

## API Endpoints

### Demo Control

**Reset Demo:**
```bash
POST /api/demo/reset

# Clears all data and re-seeds with initial state
# Returns: { success: true, seeded: { emails: 3, shipments: N } }
```

### HappyRobot Integration

**Trigger Workflow:**
```bash
POST /api/happyrobot/trigger
Content-Type: application/json

{
  "contextType": "temperature_alert",
  "contextId": "SHP-ZRH-SIN-001",
  "name": "Temperature Alert - Customer Name",
  "description": "Outbound call for temperature excursion",
  "shipmentId": "SHP-ZRH-SIN-001",
  "alert": {
    "type": "TEMPERATURE_EXCURSION",
    "severity": "CRITICAL",
    "currentTemp": 9.4,
    "thresholdTemp": 8
  }
}
```

**Get Run Status:**
```bash
GET /api/happyrobot/status?runId=run_xxxxx

# Returns: { status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" }
```

**List Runs:**
```bash
GET /api/happyrobot/runs?contextId=SHP-ZRH-SIN-001

# Returns array of HappyRobotRun records
```

### Webhook Endpoints (For HappyRobot to call)

**Receive Workflow Callbacks:**
```bash
POST /api/webhooks/happyrobot
Content-Type: application/json

{
  "event": "log" | "completed" | "failed",
  "run_id": "run_xxxxx",
  "message": "Call completed successfully",
  "timestamp": "2026-01-25T10:00:00Z"
}
```

### Data Entry Endpoints (For external platforms)

**Email Received:**
```bash
POST /api/happyrobot/email
Content-Type: application/json

{
  "emailId": "EMAIL-2026-01-25-001",
  "from": {
    "name": "Dr. Helena Müller",
    "email": "helena.mueller@pharmanova.ch",
    "company": "PharmaNova AG"
  },
  "classification": "QUOTE_REQUEST",
  "priority": "HIGH",
  "missingInfo": ["pickupDate"],
  "assignedRep": {
    "name": "Sarah Chen",
    "email": "sarah.chen@dsv.com"
  }
}
```

**Booking Created:**
```bash
POST /api/happyrobot/booking
Content-Type: application/json

{
  "bookingNumber": "BKG-2026-001",
  "quotation": { ... },
  "customerDetails": { ... },
  "temperatureControl": {
    "required": true,
    "minTemp": 2,
    "maxTemp": 8
  }
}
```

**Temperature Alert:**
```bash
POST /api/happyrobot/temperature-alert
Content-Type: application/json

{
  "shipmentId": "SHP-ZRH-SIN-001",
  "alert": {
    "type": "TEMPERATURE_EXCURSION",
    "severity": "CRITICAL",
    "reading": 9.4,
    "threshold": 8,
    "location": "Singapore Changi Airport"
  }
}
```

## Data Model

### Emails
- Customer emails classified by AI (quote requests, status inquiries, etc.)
- Fields: classification, priority, intent, status, assignedRep
- Missing information tracking for quote validation
- Tags for categorization (temperature_sensitive, urgent, etc.)

### Bookings
- Validated quotes from customer emails
- Links to original email via threadId
- Customer details and pricing information
- Temperature control requirements

### Shipments
- Active air freight shipments with real-time tracking
- Status: `IN_TRANSIT`, `IN_FLIGHT`, `ALERT`, `DELIVERED`
- Temperature monitoring (min/max ranges, current readings)
- Flight information (carrier, flight number, MAWB)
- Current GPS position for map visualization
- Progress percentage (0-100)

### Shipment Milestones
- Timeline of shipment events (DEP, ARR, RCS, DLV, etc.)
- Planned vs. actual timestamps
- Temperature readings at each checkpoint
- Alert data when temperature deviations occur
- Location and facility information

### HappyRobotRun
- Tracks AI workflow executions
- Context tracking (temperature_alert, email_classification, etc.)
- Status: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
- Platform integration (run IDs, URLs, logs)
- Real-time status polling and webhook updates

## Demo Script

### Phase 1: Email Classification (`/inbox`)

**Presenter:** "This is DSV's AI-powered inbox. Customer emails are automatically classified, prioritized, and assigned to the right representatives."

**What You See:**
- Classified emails with priority badges
- Missing information highlighted (e.g., "pickup date missing")
- Assigned reps and tags
- Real-time updates as new emails arrive

### Phase 2: Booking Creation

**Behind the Scenes:** AI agent validates the quote on HappyRobot platform, gathers missing information, creates booking.

**Result:** Booking appears in system with temperature control requirements.

### Phase 3: Shipment Dashboard (`/shipments`)

**Presenter:** "The booking becomes an active shipment on our dashboard. Notice the temperature-sensitive badge—this pharmaceutical cargo must stay between 2-8°C."

**What You See:**
- Shipment cards with temperature ranges
- Status indicators (IN_FLIGHT, IN_TRANSIT)
- Flight information (carrier, MAWB, route)
- Progress bars

### Phase 4: Map View (`/map`)

**Action:** Navigate to `/map`

**Presenter:** "Our global air freight map shows all active shipments in real-time on a 3D globe. Flight routes connect major airport hubs worldwide."

**What You See:**
- Globe visualization with flight paths
- Airport markers (ZRH, SIN, AMS, etc.)
- Plane icons showing current positions
- Temperature-sensitive shipments highlighted

### Phase 5: Temperature Alert (Automatic)

**What Happens:**
- System detects temperature excursion (9.4°C, exceeds 8°C threshold)
- Red pulsing marker appears on map
- Alert modal automatically pops up after 2 seconds

**Alert Modal Shows:**
- Current reading: 9.4°C (in red)
- Allowed range: 2-8°C
- Location: Singapore Changi Airport
- Shipment details and customer name

### Phase 6: Proactive Customer Communication

**Action:** Click "Proceed to Call Customer"

**What Happens:**
- HappyRobot workflow triggered
- AI voice agent initiates outbound call to customer
- Modal shows: "Initiating Outbound Call... AI agent is connecting with customer"
- Link to HappyRobot Platform for call details

**Presenter:** "Instead of waiting for the customer to discover the issue, our AI agent proactively calls them with detailed information about the temperature deviation, the corrective actions taken, and estimated impact. This is the future of freight forwarding—anticipating problems and communicating before customers even know there's an issue."

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Next.js + React)                                  │
│  ├── Email Inbox (/inbox)                                   │
│  ├── Shipments Dashboard (/shipments)                       │
│  ├── Air Freight Map (/map) - Mapbox GL globe              │
│  ├── Temperature Alert Modal (proactive popup)              │
│  └── useSSE Hook (real-time updates via Server-Sent Events) │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  API Routes (Next.js)                                        │
│  ├── /api/events - SSE endpoint for real-time updates       │
│  ├── /api/demo/reset - Reset demo state                     │
│  ├── /api/happyrobot/trigger - Trigger workflows            │
│  ├── /api/happyrobot/status - Poll run status               │
│  ├── /api/happyrobot/runs - List workflow runs              │
│  ├── /api/webhooks/happyrobot - Receive callbacks           │
│  ├── /api/happyrobot/email - Email received event           │
│  ├── /api/happyrobot/booking - Booking created event        │
│  └── /api/happyrobot/temperature-alert - Alert event        │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
┌──────────────────────────┐     ┌──────────────────────────────┐
│  PostgreSQL (Prisma)     │     │  Redis Pub/Sub               │
│  ├── Email               │     │  ├── dsv:email:received      │
│  ├── Booking             │     │  ├── dsv:booking:created     │
│  ├── Shipment            │     │  ├── dsv:shipment:updated    │
│  ├── ShipmentMilestone   │     │  ├── dsv:temperature:alert   │
│  └── HappyRobotRun       │     │  ├── dsv:milestone:updated   │
└──────────────────────────┘     │  └── dsv:demo:reset          │
                                 └──────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────────────┐
                              │  SSE Connections                 │
                              │  (Server-Sent Events)            │
                              │  Real-time push to all clients   │
                              └──────────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────────────┐
                              │  HappyRobot AI Platform          │
                              │  ├── Voice workflows             │
                              │  ├── Platform API (status polls) │
                              │  └── Webhooks (callbacks)        │
                              └──────────────────────────────────┘
```

## Deployment

### Railway (Recommended)

1. **Create new Railway project**
   ```bash
   railway login
   railway init
   ```

2. **Add services:**
   ```bash
   # Add PostgreSQL
   railway add --database postgres

   # Add Redis
   railway add --database redis
   ```

3. **Configure environment variables:**
   - `DATABASE_URL` (auto-configured by Railway)
   - `REDIS_URL` (auto-configured by Railway)
   - `HAPPYROBOT_WEBHOOK_URL`
   - `HAPPYROBOT_API_KEY`
   - `HAPPYROBOT_ORG_ID`
   - `APP_URL` (your Railway app URL)
   - `NEXT_PUBLIC_MAPBOX_TOKEN`

4. **Deploy:**
   ```bash
   git push
   # Railway auto-deploys on push
   ```

5. **Run migrations:**
   ```bash
   railway run npx prisma db push
   ```

See [DSV_SETUP.md](./DSV_SETUP.md) for detailed deployment instructions.

## Troubleshooting

### Redis connection issues

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Should return: PONG
```

- Verify `REDIS_URL` format: `redis://default:password@host:port`
- Check Railway Redis service is running
- Ensure Redis is on same Railway project as app

### SSE not connecting

- Check `/api/events` endpoint is accessible
- Verify browser EventSource connection in Network tab
- Check Redis pub/sub channels are correct
- Ensure firewall/proxy allows SSE connections

### Database connection errors

```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Reset database schema
npx prisma db push --force-reset

# View database
npx prisma studio
```

### Map not loading

- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Check Mapbox token has GL JS scopes enabled
- Ensure token hasn't exceeded usage limits
- Try creating new token at https://account.mapbox.com

### HappyRobot webhooks not received

1. Check `APP_URL` is set to your public Railway URL
2. Verify callback URL in HappyRobot workflow: `https://your-app.railway.app/api/webhooks/happyrobot`
3. Check Railway logs: `railway logs`
4. Test webhook endpoint manually:
   ```bash
   curl -X POST https://your-app.railway.app/api/webhooks/happyrobot \
     -H "Content-Type: application/json" \
     -d '{"event":"log","run_id":"test","message":"Test"}'
   ```

### Testing locally with HappyRobot

Use ngrok to expose localhost:

```bash
ngrok http 3000
# Set APP_URL=https://xxx.ngrok.io in .env.local
# Update HappyRobot callback URL to: https://xxx.ngrok.io/api/webhooks/happyrobot
```

## Development

### Key Files

```
├── app/
│   ├── inbox/page.tsx          # Email classification inbox
│   ├── shipments/page.tsx      # Shipments dashboard
│   ├── map/page.tsx            # Global air freight map
│   ├── api/
│   │   ├── events/route.ts     # SSE endpoint
│   │   ├── demo/reset/         # Demo reset API
│   │   ├── happyrobot/
│   │   │   ├── trigger/        # Trigger workflows
│   │   │   ├── status/         # Poll run status
│   │   │   ├── runs/           # List runs
│   │   │   ├── email/          # Email event
│   │   │   ├── booking/        # Booking event
│   │   │   └── temperature-alert/  # Alert event
│   │   └── webhooks/
│   │       └── happyrobot/     # Receive callbacks
│   └── globals.css             # DSV brand colors
├── components/
│   ├── AirFreightMap.tsx       # Mapbox globe visualization
│   ├── TemperatureAlertModal.tsx  # Alert popup with AI trigger
│   └── Layout.tsx              # Navigation sidebar
├── hooks/
│   ├── useSSE.ts               # SSE connection hook
│   ├── useHappyRobot.ts        # HappyRobot workflow hook
│   └── [legacy hooks from Sysco demo...]
├── prisma/
│   ├── schema.prisma           # Database schema (DSV models)
│   └── seed.ts                 # Legacy seed (not used)
├── lib/
│   ├── prisma.ts               # Database client (db.ts)
│   ├── redis.ts                # Redis pub/sub
│   ├── happyrobot.ts           # HappyRobot helpers
│   └── seed-data/              # Mock JSON data
│       ├── email-inbox.json
│       ├── shipments-dashboard.json
│       ├── map-view.json
│       └── shipment-milestones.json
└── DSV_SETUP.md                # Comprehensive setup guide
```

### Adding Mock Data

Edit JSON files in `/lib/seed-data/`:

**Email Example:**
```json
{
  "emailId": "EMAIL-2026-01-25-001",
  "from": {
    "name": "Dr. Helena Müller",
    "email": "helena.mueller@pharmanova.ch"
  },
  "classification": "QUOTE_REQUEST",
  "priority": "HIGH",
  "missingInfo": ["pickupDate"]
}
```

**Shipment Example:**
```json
{
  "shipmentId": "SHP-ZRH-SIN-001",
  "mawbNumber": "176-12345678",
  "routing": {
    "origin": { "code": "ZRH", "city": "Zurich" },
    "destination": { "code": "SIN", "city": "Singapore" }
  },
  "temperatureSensitive": true,
  "temperatureRange": { "min": 2, "max": 8, "unit": "C" }
}
```

Then reset demo to load: POST `/api/demo/reset`

## Navigation

- `/inbox` - Email Classification Inbox
- `/shipments` - Shipments Dashboard
- `/map` - Global Air Freight Map
- `/agents` - HappyRobot Workflow Runs

## Support

- **Detailed Setup:** [DSV_SETUP.md](./DSV_SETUP.md)
- **HappyRobot Docs:** https://docs.happyrobot.ai
- **Railway Docs:** https://docs.railway.app
- **Mapbox GL JS:** https://docs.mapbox.com/mapbox-gl-js

## License

MIT

---

**DSV Air & Sea - Proactive freight forwarding powered by AI**
