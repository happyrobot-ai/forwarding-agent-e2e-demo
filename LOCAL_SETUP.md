# Local Development Setup

Quick guide to run the DSV demo locally on your machine.

## Prerequisites

✅ You have:
- Node.js 18+ installed
- PostgreSQL installed (detected at `/opt/homebrew/opt/postgresql@16/bin/psql`)

❌ You need:
- Redis (see options below)

## Option 1: Quick Start (Use Railway Redis)

This is the fastest way - use Railway's hosted Redis while developing locally.

### 1. Create Railway Services

```bash
# Login to Railway
railway login

# Create project (if you haven't)
railway init

# Add PostgreSQL
railway add --database postgres

# Add Redis
railway add --database redis
```

### 2. Get Database URLs

```bash
# Get your Railway DATABASE_URL
railway variables --json | grep DATABASE_URL

# Get your Railway REDIS_URL
railway variables --json | grep REDIS_URL
```

### 3. Create `.env.local`

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Railway URLs:

```bash
# Railway Postgres (from step 2)
DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:xxxx/railway"

# Railway Redis (from step 2)
REDIS_URL="redis://default:xxx@xxx.railway.app:xxxx"

# HappyRobot (optional for now - can test without)
HAPPYROBOT_WEBHOOK_URL="https://run.happyrobot.ai/..."
HAPPYROBOT_API_KEY="hr_api_xxxxx"
HAPPYROBOT_ORG_ID="org_xxxxx"
HAPPYROBOT_X_API_KEY="your_key"

# Local app URL
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Mapbox (optional - map will work without it, just no tiles)
NEXT_PUBLIC_MAPBOX_TOKEN="pk.xxxxx"
```

### 4. Install Dependencies & Setup Database

```bash
# Install packages
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) View database
npx prisma studio
```

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 🎉

### 6. Reset Demo Data

Visit http://localhost:3000 and click "Reset Demo" in the sidebar, or:

```bash
curl -X POST http://localhost:3000/api/demo/reset
```

---

## Option 2: Fully Local (Install Redis)

If you want everything local:

### 1. Install Redis

```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Or run in foreground for testing
redis-server
```

### 2. Install PostgreSQL (Already Installed ✅)

You already have PostgreSQL installed. Make sure it's running:

```bash
brew services start postgresql@16

# Create a database
createdb dsv_demo
```

### 3. Create `.env.local`

```bash
# Local Postgres
DATABASE_URL="postgresql://mahika@localhost:5432/dsv_demo"

# Local Redis
REDIS_URL="redis://localhost:6379"

# HappyRobot (optional for testing)
HAPPYROBOT_WEBHOOK_URL="https://run.happyrobot.ai/..."
HAPPYROBOT_API_KEY="hr_api_xxxxx"
HAPPYROBOT_ORG_ID="org_xxxxx"

# Local app URL
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Mapbox (optional)
NEXT_PUBLIC_MAPBOX_TOKEN="pk.xxxxx"
```

### 4. Setup & Run

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## Testing Without HappyRobot

You can test the demo without HappyRobot credentials:

- Email inbox, shipments, and map will work perfectly
- Temperature alert modal will show but won't trigger actual calls
- Just don't click "Proceed to Call Customer" button

To fully test the AI call workflow, you'll need HappyRobot credentials.

---

## Testing With HappyRobot (Local Webhooks)

To receive HappyRobot webhooks locally:

### 1. Install ngrok

```bash
brew install ngrok
```

### 2. Expose Local Server

```bash
# In one terminal
npm run dev

# In another terminal
ngrok http 3000
```

### 3. Update Environment

Copy the ngrok URL (e.g., `https://xxxx.ngrok.io`):

```bash
# In .env.local
APP_URL="https://xxxx.ngrok.io"
NEXT_PUBLIC_APP_URL="https://xxxx.ngrok.io"
```

### 4. Configure HappyRobot

In HappyRobot workflow settings:
- Callback URL: `https://xxxx.ngrok.io/api/webhooks/happyrobot`

Now restart your dev server and test the full flow!

---

## Useful Commands

```bash
# View database
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Check Redis connection
redis-cli ping  # Should return "PONG"

# Check Postgres connection
psql $DATABASE_URL -c "SELECT 1"

# View logs
npm run dev  # Shows all Next.js logs

# Test SSE endpoint
curl http://localhost:3000/api/events

# Reset demo data
curl -X POST http://localhost:3000/api/demo/reset
```

---

## Troubleshooting

### "Redis connection failed"

If using Railway Redis:
- Check `REDIS_URL` is correct
- Make sure Railway Redis service is running
- Test: `redis-cli -u $REDIS_URL ping`

If using local Redis:
- Check Redis is running: `brew services list`
- Start it: `brew services start redis`

### "Database connection failed"

- Check `DATABASE_URL` format
- Ensure database exists: `createdb dsv_demo`
- Test: `psql $DATABASE_URL -c "SELECT 1"`

### "Port 3000 already in use"

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Map not loading

- Get free Mapbox token at https://account.mapbox.com
- Add to `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`
- Restart dev server

---

## Next Steps

Once running locally:
1. Visit http://localhost:3000/inbox - See email inbox
2. Visit http://localhost:3000/shipments - See shipments dashboard
3. Visit http://localhost:3000/map - See global map
4. Click "Reset Demo" to load initial data
5. Watch the temperature alert auto-popup after 2 seconds on map view

For production deployment, see [DSV_SETUP.md](./DSV_SETUP.md).
