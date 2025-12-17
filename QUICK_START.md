# Quick Start Guide

## Fastest Setup (Railway PostgreSQL - Recommended)

### 1. Create Railway Database (2 minutes)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Provision PostgreSQL"
3. Click on the PostgreSQL service
4. Go to "Connect" tab
5. Copy the "Postgres Connection URL"

### 2. Configure Environment

Update your `.env` file:

```bash
# Paste your Railway PostgreSQL URL here
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:7432/railway"

# Pusher Configuration (get from https://dashboard.pusher.com)
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
PUSHER_CLUSTER="us2"

NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 4. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Alternative: Local PostgreSQL

### If you have PostgreSQL installed locally:

1. Create a database:
```bash
createdb sysco_demo
```

2. Update `.env`:
```bash
DATABASE_URL="postgresql://localhost:5432/sysco_demo"
```

3. Run migrations:
```bash
npx prisma generate
npx prisma migrate deploy
```

4. Start:
```bash
npm run dev
```

---

## Alternative: Docker PostgreSQL

```bash
# Start PostgreSQL in Docker
docker run --name sysco-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sysco_demo \
  -p 5432:5432 \
  -d postgres:15

# Update .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sysco_demo"

# Run migrations
npx prisma generate
npx prisma migrate deploy

# Start app
npm run dev
```

---

## Pusher Setup (Required for Real-time Features)

1. Go to [dashboard.pusher.com](https://dashboard.pusher.com)
2. Create a new app (free tier)
3. Copy credentials to `.env`
4. Restart dev server

---

## Troubleshooting

### "DATABASE_URL is not defined"
- Check `.env` file exists
- Make sure DATABASE_URL is set
- Restart the dev server

### "Can't reach database server"
- Verify your database is running
- Check the connection string format
- For Railway, make sure you copied the full URL

### Prisma errors
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```
