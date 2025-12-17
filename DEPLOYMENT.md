# Deployment Guide

This guide covers deploying the Sysco Supply Chain AI Demo to Railway or Vercel.

## Important: Prisma 7 + Next.js Build Note

This project uses Prisma 7 which has a new configuration approach. During local development, if you encounter build errors related to Prisma, ensure:

1. Your DATABASE_URL is properly set in `.env`
2. Run `npx prisma generate` after any schema changes
3. For production builds, the database must be accessible during build time OR you can use `output: standalone` in next.config.ts

## Option 1: Railway Deployment (Recommended)

Railway provides PostgreSQL hosting and makes deployment seamless.

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up or log in
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account and select this repository

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL instance
4. Copy the connection string (it starts with `postgresql://`)

### Step 3: Configure Environment Variables

In your Railway service settings, add these environment variables:

```bash
# Database (automatically provided by Railway if you add Postgres service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Pusher Configuration
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=us2

# Public Pusher vars (for client-side)
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

### Step 4: Run Database Migrations

Railway will automatically run the build, but you need to migrate the database:

1. In Railway, open your service's "Settings"
2. Go to "Deploy" section
3. Add a "Build Command" override:
   ```bash
   npx prisma migrate deploy && npm run build
   ```

Or connect via Railway CLI and run manually:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npx prisma migrate deploy
```

### Step 5: Deploy

1. Push code to your connected GitHub repo
2. Railway automatically builds and deploys
3. Your app will be live at `https://your-app.up.railway.app`

## Option 2: Vercel Deployment

### Step 1: Set Up Database

Vercel doesn't provide PostgreSQL by default. You have two options:

**Option A: Vercel Postgres (Recommended)**

1. In your Vercel project dashboard
2. Go to "Storage" tab
3. Click "Create Database" → "Postgres"
4. Vercel will create a database and automatically set `DATABASE_URL`

**Option B: External PostgreSQL**

Use Railway, Supabase, or Neon for PostgreSQL:
- Railway: https://railway.app
- Supabase: https://supabase.com
- Neon: https://neon.tech

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts to link project
```

Or use Vercel's GitHub integration:
1. Go to [vercel.com](https://vercel.com)
2. "Import Project" from GitHub
3. Select this repository

### Step 3: Configure Environment Variables

In Vercel project settings → "Environment Variables":

```bash
DATABASE_URL=your_postgres_connection_string

PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=us2

NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

### Step 4: Run Migrations

After first deploy:

```bash
# Using Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy

# Or use Vercel's terminal (in project dashboard)
```

## Setting Up Pusher

1. Go to [dashboard.pusher.com](https://dashboard.pusher.com)
2. Create a new app (free tier works)
3. Name it "sysco-demo" or similar
4. Select a cluster close to your users (e.g., `us2` for US East Coast)
5. Copy credentials:
   - App ID
   - Key
   - Secret
   - Cluster

## Post-Deployment: Seed Demo Data

After first deployment, trigger the demo setup:

```bash
curl -X POST https://your-app-url.com/api/demo/trigger
```

This creates:
- Sample orders
- Initial incident (you can clear it by refreshing)
- Agent run placeholders

## Connecting Your AI Agent Platform

Your AI agent platform needs to send webhooks to:

```
POST https://your-app-url.com/api/webhooks/agent-update
POST https://your-app-url.com/api/webhooks/resolution
```

Configure these URLs in your agent platform's webhook settings.

### Testing Webhooks

Use curl to test webhook integration:

```bash
# Test agent update
curl -X POST https://your-app-url.com/api/webhooks/agent-update \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "supplier-agent-test",
    "stage": "supplier_negotiation",
    "status": "success",
    "reasoning": "Test webhook",
    "ui_action": "update_map"
  }'

# Test resolution
curl -X POST https://your-app-url.com/api/webhooks/resolution \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "test-incident-id",
    "summary": "Test resolution"
  }'
```

## Troubleshooting

### Build fails with Prisma error

If the build fails during Prisma client generation:

1. Ensure `DATABASE_URL` is set in environment variables
2. Check that the database is accessible from the build environment
3. Verify `prisma.config.ts` has correct datasource configuration

### Real-time updates not working

1. Check Pusher credentials in environment variables
2. Verify `NEXT_PUBLIC_*` variables are set (they're exposed to client)
3. Check browser console for Pusher connection errors
4. Test Pusher connection using their debug console

### Database connection fails in production

1. Verify connection string format:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```
2. Ensure database allows connections from your deployment platform's IPs
3. Check if SSL is required (add `?sslmode=require` to connection string)

### API routes return 500

1. Check deployment logs for error details
2. Verify all environment variables are set
3. Ensure database migrations have run
4. Test API routes individually with curl

## Monitoring & Logs

### Railway

View logs in real-time:
```bash
railway logs
```

Or in the Railway dashboard under "Deployments"

### Vercel

View logs in:
1. Project dashboard → "Logs" tab
2. Or use Vercel CLI: `vercel logs`

## Updating the Deployment

### Railway

Push to GitHub → Railway automatically redeploys

### Vercel

```bash
# Redeploy current branch
vercel --prod

# Or push to GitHub if using GitHub integration
git push
```

## Cost Estimates

### Free Tier Limitations

**Railway Free Tier:**
- $5 free credit per month
- PostgreSQL included
- Good for demos and development

**Vercel Free Tier:**
- 100GB bandwidth/month
- Unlimited deployments
- Need external database (Vercel Postgres has free tier)

**Pusher Free Tier:**
- 200k messages/day
- 100 concurrent connections
- Perfect for demos

### Production Costs

For a production deployment serving 1000 active users:
- Railway: ~$20-40/month (app + database)
- Vercel Pro: $20/month + database costs
- Pusher: $49/month for Channels plan

## Security Checklist

Before going live:

- [ ] Environment variables set in deployment platform (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Database has strong password
- [ ] Pusher secret not exposed in client code
- [ ] API routes have rate limiting (add if needed)
- [ ] Webhook endpoints have authentication (add if needed)
- [ ] HTTPS enabled (automatic on Railway/Vercel)

## Backup & Recovery

### Database Backups

**Railway:**
- Automatic daily backups included
- Access via Railway dashboard → Database → Backups

**Vercel Postgres:**
- Automatic backups on paid plans
- Manual export: `pg_dump` via connection string

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Performance Optimization

For high-traffic deployments:

1. **Enable Prisma Connection Pooling:**
   Update `DATABASE_URL` to use connection pooling:
   ```
   DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=10"
   ```

2. **Add Caching:**
   Consider adding Redis for order/incident caching

3. **Optimize Pusher:**
   Use presence channels for agent status instead of polling

4. **Database Indexes:**
   Already included in Prisma schema for common queries

## Support

For deployment issues:
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Pusher: https://support.pusher.com

For application issues:
- Check GitHub issues
- Review logs for specific error messages
- Test locally first with same environment variables
