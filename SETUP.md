# HappyRobot Forwarding Demo Setup Guide

## Overview

This is a HappyRobot freight forwarding demo showcasing AI-powered proactive communication for temperature-sensitive shipments.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Demo Storyline Flow                                          │
│  ═══════════════════                                         │
│                                                              │
│  1. Email arrives → HappyRobot classifies → Shows in inbox   │
│  2. HappyRobot validates quote → Creates booking             │
│  3. Booking appears on shipment dashboard                    │
│  4. Map view shows shipment with temperature monitoring      │
│  5. Temperature alert detected → Proactive popup             │
│  6. User clicks "Proceed to Call" → Triggers HappyRobot     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Framework**: Next.js 16
- **Database**: PostgreSQL (Railway)
- **Real-time**: Redis + SSE (Railway)
- **AI Voice**: HappyRobot workflows
- **Styling**: Tailwind CSS

## Setup Steps

### 1. Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add Postgres
railway add --database postgres

# Add Redis
railway add --database redis
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# From Railway Postgres service
DATABASE_URL="postgresql://..."

# From Railway Redis service
REDIS_URL="redis://..."

# From HappyRobot workflow settings
HAPPYROBOT_WEBHOOK_URL="https://run.happyrobot.ai/..."
HAPPYROBOT_API_KEY="hr_api_..."
HAPPYROBOT_ORG_ID="org_..."

# Your Railway app URL
APP_URL="https://your-app.railway.app"
```

### 3. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (for development)
npx prisma db push

# Or run migrations (for production)
npx prisma migrate deploy
```

### 4. Deploy to Railway

```bash
# Push to GitHub
git add .
git commit -m "Initial HappyRobot Forwarding demo setup"
git push

# Deploy
railway up
```

## HappyRobot Integration

### API Endpoints

Your app exposes these endpoints for HappyRobot:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/happyrobot/trigger` | POST | Trigger workflows |
| `/api/happyrobot/status` | GET | Poll run status |
| `/api/happyrobot/runs` | GET | List all runs |
| `/api/webhooks/happyrobot` | POST | Receive callbacks |

### Event Webhooks (For your platform to call)

| Endpoint | Purpose |
|----------|---------|
| `/api/happyrobot/email` | Email received event |
| `/api/happyrobot/booking` | Booking created event |
| `/api/happyrobot/temperature-alert` | Temperature alert event |

### Workflow Configuration

In HappyRobot dashboard:

1. **Set callback URL**: `https://your-app.railway.app/api/webhooks/happyrobot`
2. **Add X-API-KEY header** (optional): Your `HAPPYROBOT_X_API_KEY`
3. **Configure workflow variables** as needed for your demo

## Demo Flow Details

### 1. Email Inbox (`/inbox`)

Shows classified customer emails:
- Quote requests, status inquiries, etc.
- Assigned rep, priority, tags
- Missing info highlighted (e.g., "pickup date missing")

**Trigger from your platform:**
```bash
POST /api/happyrobot/email
Content-Type: application/json

{
  "emailId": "EMAIL-2026-02-18-001",
  "from": { "name": "Dr. Helena Müller", ... },
  "classification": "QUOTE_REQUEST",
  "missingInfo": ["pickupDate"]
}
```

### 2. Booking Created

**Trigger from your platform:**
```bash
POST /api/happyrobot/booking
Content-Type: application/json

{
  "quotation": { ... },
  "customerDetails": { ... },
  "temperatureControl": {
    "required": true,
    "minTemp": 2,
    "maxTemp": 8
  }
}
```

### 3. Shipment Dashboard (`/dashboard`)

Shows active shipments with:
- Temperature-sensitive badges
- Status indicators
- Flight info

### 4. Map View (`/map`)

Live map with:
- Air shipments tracked globally
- Temperature status for sensitive cargo
- Proactive alert popup when deviation detected

### 5. Temperature Alert Popup

When alert detected:
- Shows temperature deviation details
- "Proceed to Call" button triggers HappyRobot outbound call

```typescript
// Triggered when user clicks "Proceed to Call"
const response = await trigger({
  contextType: 'temperature_alert',
  contextId: shipmentId,
  name: 'Outbound Call - Temperature Alert',
  customer_phone: '+41612345678',
  customer_name: 'Dr. Helena Müller',
  issue: 'Temperature exceeded 8°C threshold',
});
```

## Real-time Updates

The app uses Redis + SSE for real-time updates:

```typescript
// Client connects to SSE
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
  const { type, channel, data } = JSON.parse(event.data);

  switch (channel) {
    case 'hr:email:received':
      // Update inbox
      break;
    case 'hr:booking:created':
      // Update dashboard
      break;
    case 'hr:temperature:alert':
      // Show alert popup
      break;
  }
};
```

## Demo Reset

Click "Reset Demo" in sidebar to restore initial state:
- Clears all emails, bookings, shipments
- Re-seeds with mock data
- Broadcasts reset event to all clients

## Color Scheme

HappyRobot Brand Colors:

```css
--hr-navy: #003366       /* Primary brand color */
--hr-silver: #C0C5CE     /* Secondary/accents */
--hr-silver-light: #E8EAED /* Borders/surfaces */
```

## Navigation

- `/inbox` - Email Inbox
- `/dashboard` - Shipments Dashboard
- `/map` - Map View (Live Tracking)
- `/agents` - AI Agents (HappyRobot runs)

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

**Note**: For local development, you'll need:
- Local Postgres (or use Railway DB URL)
- Local Redis (or use Railway Redis URL)
- HappyRobot callback URL via ngrok/tunneling

## Troubleshooting

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
```

### Database Issues

```bash
# Reset database
npx prisma db push --force-reset

# View database in Studio
npx prisma studio
```

### HappyRobot Webhooks Not Received

1. Check `APP_URL` is set correctly
2. Verify callback URL in HappyRobot workflow settings
3. Check Railway logs: `railway logs`

## Support

For questions or issues, check:
- HappyRobot docs: https://docs.happyrobot.ai
- Railway docs: https://docs.railway.app
