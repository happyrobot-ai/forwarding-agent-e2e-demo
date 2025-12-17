# Sysco Supply Chain AI - Self-Healing Demo

A demonstration of AI agents autonomously resolving supply chain disruptions through real-time negotiation and orchestration.

## Overview

This application showcases a "Self-Healing Supply Chain" where AI agents don't just alert humans to problems—they actively solve them. When a critical shipment fails, agents negotiate with suppliers and coordinate fleet rerouting in real-time, all displayed through an interactive dashboard.

### The Demo Scenario: "The Prime Rib Crisis"

**Context:** 2:00 PM - A critical inbound shipment of Prime Rib for the DFW distribution center has failed due to equipment failure.

**Stakes:** 42 high-end restaurant customers expecting delivery tomorrow. A shortage means lost revenue and damaged relationships.

**Resolution:** AI agents autonomously:
1. Contact local supplier (Texas Quality Meats) to secure inventory
2. Reroute nearby Sysco driver (Marcus) who has available capacity
3. Coordinate pickup and update all systems
4. Send confirmation notifications

**Result:** Crisis resolved in minutes instead of hours of manual coordination.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Pusher (WebSockets)
- **Deployment:** Railway (or Vercel)
- **AI Agents:** External agent platform integration via webhooks

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or Railway)
- Pusher account (free tier works)
- Optional: AI agent platform for voice calls

### Installation

1. **Install dependencies:**

```bash
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
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init
```

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Demo Script

### Phase 1: The Setup (Green Dashboard)

**Presenter:** "This is the Sysco Supply Chain Command Center. Everything is running smoothly—98% service level, orders confirmed and in transit."

### Phase 2: The Disruption

**Action:** Click "Simulate Incident" button

**Visual Changes:**
- Dashboard flashes RED
- Alert banner appears: "CRITICAL ALERT: Inbound Shipment #8821 (Prime Rib) Cancelled"
- Service level drops to 92%
- Order #8821 status changes to "CANCELLED"

**Presenter:** "A supplier's equipment just failed. We're short 5 pallets of Prime Rib for 42 restaurant customers. Normally, this means 2+ hours of phone calls. Watch what our AI agents do instead."

### Phase 3: The War Room

**Action:** Click on the red alert to open War Room Modal

**What You See:**
- Left side: Map showing warehouse, truck, and supplier locations
- Right side: Two Agent Cards (Supplier & Driver)
- Bottom: Live Reasoning Log

### Phase 4: The Live Action

**Supplier Agent Call:**
- Agent Card turns GREEN with pulsing animation
- Live log shows: "Contacting Texas Quality Meats..."
- Map adds green pin for supplier location

**Driver Agent Call:**
- Second Agent Card turns GREEN with pulsing animation
- Map shows truck icon moving
- Route line morphs to show detour through supplier
- Order status changes to "IN_TRANSIT"

### Phase 5: The Resolution

**Visual Payoff:**
- Both agent cards show "Success" with checkmarks
- Service level climbs back to 98%
- Order #8821 turns GREEN - Status: "RECOVERED - IN TRANSIT"
- Email toast slides in showing confirmation

**Presenter:** "Crisis resolved autonomously in under 5 minutes. This is the future of supply chain orchestration."

## API Webhook Integration

Your AI agent platform should POST to these endpoints:

### Agent Update

```bash
POST /api/webhooks/agent-update
Content-Type: application/json

{
  "run_id": "supplier-agent-12345",
  "stage": "supplier_negotiation",
  "status": "success",
  "reasoning": "Supplier has stock. Arranging pickup.",
  "ui_action": "update_map"
}
```

### Resolution

```bash
POST /api/webhooks/resolution
Content-Type: application/json

{
  "incident_id": "uuid",
  "summary": "Crisis resolved..."
}
```

## Deployment

### Railway

1. Create new project in Railway
2. Add PostgreSQL service
3. Connect GitHub repo
4. Add environment variables
5. Deploy automatically on push

### Vercel

1. Import project to Vercel
2. Add PostgreSQL database
3. Configure environment variables
4. Deploy

## Troubleshooting

### Pusher not connecting

- Verify keys in `.env` match Pusher dashboard
- Check that `NEXT_PUBLIC_*` vars are set correctly

### Database connection errors

- Confirm PostgreSQL is running
- Verify `DATABASE_URL` format
- Run `npx prisma generate` after schema changes

### Testing webhooks locally

Use ngrok to expose localhost:

```bash
ngrok http 3000
# Update agent webhooks to: https://xxx.ngrok.io/api/webhooks/...
```

## License

MIT

---

**Built for the future of autonomous supply chains**
