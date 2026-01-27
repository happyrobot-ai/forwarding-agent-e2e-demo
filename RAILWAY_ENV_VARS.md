# Railway Environment Variables

Add these environment variables in your Railway project settings:

## Required Variables

### Database (Auto-configured by Railway)
- `DATABASE_URL` - Automatically set when you add PostgreSQL database
  - Format: `postgresql://user:password@host:port/database`
  - Railway sets this automatically when you add PostgreSQL service

### Redis (Auto-configured by Railway)
- `REDIS_URL` - Automatically set when you add Redis database
  - Format: `redis://default:password@host:port`
  - Railway sets this automatically when you add Redis service
  - **Note:** If not using Redis, the app will fallback to localhost (won't work in production)

### HappyRobot Integration
- `HAPPYROBOT_WEBHOOK_URL` - Your HappyRobot workflow webhook URL
  - Format: `https://workflows.platform.happyrobot.ai/hooks/xxxxx`
  - Get this from your HappyRobot workflow settings

- `HAPPYROBOT_API_KEY` - HappyRobot Platform API key
  - Used for querying run status
  - Get from HappyRobot Platform dashboard

- `HAPPYROBOT_ORG_ID` - Your HappyRobot organization ID
  - Used for API authentication
  - Get from HappyRobot Platform dashboard

- `HAPPYROBOT_X_API_KEY` - Optional API key for webhook authentication
  - Used in X-API-KEY header when triggering workflows
  - Optional but recommended for security

### App URL (Set after first deploy)
- `APP_URL` - Your Railway app URL
  - Format: `https://your-app-name.up.railway.app`
  - **Set this AFTER first deployment** - Railway will show you the URL
  - Used for webhook callbacks

- `NEXT_PUBLIC_APP_URL` - Same as APP_URL (for client-side)
  - Format: `https://your-app-name.up.railway.app`
  - Set to same value as APP_URL

### Mapbox (Required for map view)
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Your Mapbox access token
  - Get from: https://account.mapbox.com/access-tokens/
  - Required for the `/map` page to work
  - Make sure token has GL JS scopes enabled

### Pusher (For real-time updates - Optional)
If you're using Pusher for real-time features:

- `PUSHER_APP_ID` - Pusher app ID
  - Get from: https://dashboard.pusher.com

- `PUSHER_KEY` - Pusher app key
  - Get from: https://dashboard.pusher.com

- `PUSHER_SECRET` - Pusher app secret
  - Get from: https://dashboard.pusher.com

- `PUSHER_CLUSTER` - Pusher cluster (e.g., `us2`, `eu`, `ap-southeast-1`)
  - Get from: https://dashboard.pusher.com

- `NEXT_PUBLIC_PUSHER_KEY` - Same as PUSHER_KEY (for client-side)
  - Set to same value as PUSHER_KEY

- `NEXT_PUBLIC_PUSHER_CLUSTER` - Same as PUSHER_CLUSTER (for client-side)
  - Set to same value as PUSHER_CLUSTER

## Optional Variables

- `NODE_ENV` - Automatically set by Railway to `production`
  - Don't need to set manually

## Quick Setup Checklist

1. ✅ Add PostgreSQL database → `DATABASE_URL` auto-set
2. ✅ Add Redis database → `REDIS_URL` auto-set
3. ✅ Set `HAPPYROBOT_WEBHOOK_URL`
4. ✅ Set `HAPPYROBOT_API_KEY`
5. ✅ Set `HAPPYROBOT_ORG_ID`
6. ✅ Set `HAPPYROBOT_X_API_KEY` (optional)
7. ✅ Set `NEXT_PUBLIC_MAPBOX_TOKEN`
8. ✅ Set Pusher variables (if using Pusher)
9. ✅ Deploy once, then set `APP_URL` and `NEXT_PUBLIC_APP_URL` to your Railway URL

## After First Deploy

1. Get your Railway app URL (e.g., `https://dsv-demo.up.railway.app`)
2. Set `APP_URL` = your Railway URL
3. Set `NEXT_PUBLIC_APP_URL` = your Railway URL
4. Run database migrations:
   ```bash
   railway link
   railway run npx prisma db push
   ```
