# Complete Vercel Deployment Guide

## ✅ What We Just Changed

### Replaced Components

| Old (Heroku) | New (Vercel Stack) | Status |
|--------------|-------------------|--------|
| Heroku Dynos | ✅ Vercel (already have Pro) | FREE on your plan |
| Heroku PostgreSQL | ✅ Supabase (already have account) | FREE tier or existing plan |
| Heroku Redis + BullMQ | ✅ Inngest (already have account) | FREE 50k events/mo |
| Worker Dynos | ✅ Inngest Functions | Serverless |

### Files Changed
- ✅ `app/inngest/client.ts` - Created (Inngest client)
- ✅ `app/inngest/functions.ts` - Created (3 job functions)
- ✅ `app/routes/api.inngest.tsx` - Created (Inngest endpoint)
- ✅ `app/lib/shopify/webhook-handlers.ts` - Updated (BullMQ → Inngest)
- ✅ `app/routes/webhooks.17track.tsx` - Updated (BullMQ → Inngest)
- ✅ `prisma/schema.prisma` - Updated (SQLite → PostgreSQL)
- ✅ `.env.example` - Updated (new env vars)
- ✅ `vercel.json` - Created
- ✅ `package.json` - Added inngest dependency

### Files to Delete (Optional Cleanup)
- `app/workers/` - No longer needed (replaced by Inngest)
- `Procfile` - No longer needed (Heroku specific)

## Step 1: Setup Supabase Database (5 minutes)

### 1.1 Create New Project

**In Supabase Dashboard** (supabase.com):

1. Click "New project"
2. Project name: `dropship-tracking`
3. Database password: Generate strong password
4. Region: Choose closest to your Vercel region
5. Click "Create new project"
6. Wait ~2 minutes for provisioning

### 1.2 Get Connection Strings

Once provisioned, go to **Settings → Database**

**Copy these values:**

1. **Connection pooling** section:
   - Mode: "Transaction"
   - Copy connection string → This is your `DATABASE_URL`
   ```
   postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

2. **Direct connection** section:
   - Copy connection string → This is your `DIRECT_URL`
   ```
   postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

**Update your local .env:**
```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
```

### 1.3 Run Migrations

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Create migration for PostgreSQL
npx prisma migrate dev --name init_postgres

# Verify
npx prisma studio
```

## Step 2: Setup Inngest (3 minutes)

### 2.1 Get Inngest Keys

**In Inngest Dashboard** (inngest.com):

You already have an account! Use the same one as your other project.

1. Go to your Inngest dashboard
2. Click "Create app" or use existing app
3. App name: `dropship-tracking`
4. Copy these keys:
   - `INNGEST_EVENT_KEY` - For sending events
   - `INNGEST_SIGNING_KEY` - For receiving webhooks

**Update your local .env:**
```bash
INNGEST_EVENT_KEY="your_event_key_here"
INNGEST_SIGNING_KEY="your_signing_key_here"
```

### 2.2 Test Inngest Locally

```bash
# Start dev server
npm run dev

# In another terminal, start Inngest dev server
npx inngest-cli dev

# Visit: http://localhost:8288
# You should see your 3 functions registered
```

## Step 3: Deploy to Vercel (5 minutes)

### 3.1 Push to GitHub

```bash
# Initialize git if not done
git init
git add .
git commit -m "Migrate to Vercel + Inngest + Supabase"

# Create GitHub repo and push
# (or use your existing repo)
git remote add origin https://github.com/yourusername/dropship-tracking.git
git push -u origin main
```

### 3.2 Import to Vercel

**In Vercel Dashboard:**

1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Framework: **Remix** (auto-detected)
4. Root Directory: `./`
5. **DON'T DEPLOY YET** - Click "Environment Variables" first

### 3.3 Add Environment Variables

Add these in Vercel:

```bash
# Shopify (from Shopify Partners Dashboard)
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_client_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_fulfillments,write_fulfillments

# 17TRACK
SEVENTEEN_TRACK_API_KEY=your_17track_key

# Database (from Supabase)
DATABASE_URL=postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres

# Inngest (from Inngest Dashboard)
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Security (generate new ones)
SESSION_SECRET=<generate with: openssl rand -base64 32>
ENCRYPTION_KEY=<generate with: openssl rand -base64 32>

# App URL (will be your Vercel URL)
APP_URL=https://your-project.vercel.app
NODE_ENV=production
```

### 3.4 Deploy

1. Click "Deploy"
2. Wait ~2 minutes
3. Copy your deployment URL: `https://your-project.vercel.app`

### 3.5 Update APP_URL

1. Go to Vercel → Settings → Environment Variables
2. Edit `APP_URL` to your actual Vercel URL
3. Redeploy

## Step 4: Configure Inngest Webhook (2 minutes)

**In Inngest Dashboard:**

1. Go to your app settings
2. Add event source webhook:
   ```
   https://your-project.vercel.app/api/inngest
   ```
3. Save

**Verify:**
- Visit: `https://your-project.vercel.app/api/inngest`
- Should see Inngest registration page

## Step 5: Configure Shopify App (Same as Before)

**In Shopify Partners Dashboard:**

1. App URL: `https://your-project.vercel.app`
2. Redirect URL: `https://your-project.vercel.app/auth/callback`
3. App Proxy:
   - Subpath prefix: `apps`
   - Subpath: `track`
   - Proxy URL: `https://your-project.vercel.app/apps`

Update Vercel environment variables with your Shopify credentials if not done already.

## Step 6: Configure 17TRACK (Same as Before)

**In 17TRACK Dashboard:**

1. Webhook URL: `https://your-project.vercel.app/webhooks/17track`

## Step 7: Test Everything (5 minutes)

### 7.1 Test Installation

Visit:
```
https://your-project.vercel.app/auth/shopify?shop=your-dev-store.myshopify.com
```

### 7.2 Check Inngest Dashboard

After installing:
1. Go to Inngest dashboard
2. You should see the `tracking/register` event fired
3. Check function runs

### 7.3 Create Test Order

1. In Shopify, create order with tracking
2. Check Inngest dashboard for events:
   - `tracking/register`
   - `tracking/event.process`
   - `tracking/status.update`

### 7.4 View Tracking Page

```
https://your-dev-store.myshopify.com/apps/track/YOUR_TRACKING_NUMBER
```

## Cost Comparison

### Heroku (Original Plan)
```
Web Dyno:      $7/mo
Worker Dyno:   $7/mo
PostgreSQL:    $50/mo
Redis:         $15/mo
-----------------------
Total:         $79/mo
```

### Vercel Stack (New)
```
Vercel:        $0 (included in your Pro plan)
Supabase:      $0 (free tier) or use existing
Inngest:       $0 (50k events/mo free)
-----------------------
Total:         $0/mo 🎉
```

## Advantages of Vercel Stack

### ✅ Cost
- **$79/month → $0/month** (uses your existing plans)
- Or minimal cost if upgrading Supabase

### ✅ Performance
- **Edge deployment** with Vercel
- **Serverless functions** scale automatically
- **Global CDN** included

### ✅ Developer Experience
- **Git-based deploys** - push to deploy
- **Preview deployments** for PRs
- **Built-in monitoring** in Vercel + Inngest dashboards
- **No server management**

### ✅ Reliability
- **Auto-scaling** for traffic spikes
- **Built-in retries** in Inngest
- **99.99% uptime** on Vercel Pro
- **Database backups** in Supabase

### ✅ Monitoring
- **Inngest Dashboard** - See all job runs, failures, retries
- **Vercel Analytics** - Built-in performance monitoring
- **Supabase Dashboard** - Database queries, logs
- **Better visibility** than Heroku logs

## Troubleshooting

### Build Fails on Vercel

**Error: Prisma generate fails**
```bash
# Make sure vercel.json has:
"buildCommand": "npx prisma generate && npm run build"
```

**Error: DATABASE_URL not found**
- Check environment variables in Vercel dashboard
- Make sure you added both `DATABASE_URL` and `DIRECT_URL`

### Inngest Functions Not Appearing

**In Inngest Dashboard, no functions shown:**
1. Check `/api/inngest` endpoint works
2. Verify `INNGEST_SIGNING_KEY` is set
3. Check Vercel logs for errors

**Functions shown but not executing:**
1. Check `INNGEST_EVENT_KEY` is correct
2. Verify events are being sent (check code)
3. Look at function logs in Inngest dashboard

### Database Connection Fails

**Error: "Can't reach database server"**
- Verify `DATABASE_URL` and `DIRECT_URL` are correct
- Check Supabase project is active
- Try connection pooling URL (port 6543)

**Error: SSL connection required**
- Supabase requires SSL
- Prisma handles this automatically with correct URL

### OAuth Fails

Same as before:
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- Check `APP_URL` matches Vercel deployment URL
- Ensure redirect URL is configured in Shopify

## Development Workflow

### Local Development

```bash
# Terminal 1: Supabase (use cloud, no local needed)
# Already running in cloud!

# Terminal 2: Inngest Dev Server
npx inngest-cli dev

# Terminal 3: Remix Dev Server
npm run dev
```

### Deploy Changes

```bash
git add .
git commit -m "Your changes"
git push

# Vercel auto-deploys! 🚀
```

### Run Migrations

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Deploy to production
# Push to git, Vercel will run migrations automatically
# OR manually:
# Vercel → Settings → Environment Variables → Add DIRECT_URL
# Then migrations run on build
```

## Monitoring

### Vercel Logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs your-project.vercel.app
```

### Inngest Dashboard
- Visit inngest.com/app
- See all function runs, retries, failures
- Real-time monitoring
- Much better than BullMQ!

### Supabase Dashboard
- Visit supabase.com/dashboard
- See database queries
- Check table data
- Monitor performance

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test on development store
3. ✅ Monitor Inngest dashboard for job runs
4. ✅ Verify redaction works
5. ✅ Share installation URL with merchants

## Summary

You successfully migrated from:
- ❌ Heroku → ✅ Vercel (your existing Pro plan)
- ❌ Heroku PostgreSQL → ✅ Supabase (your existing account)
- ❌ BullMQ + Redis → ✅ Inngest (your existing account)

**Benefits:**
- 💰 $79/month → $0/month
- 🚀 Faster deployments
- 📊 Better monitoring
- 🔄 Auto-scaling
- 🛠️ Better developer experience

**Result:** Same app, better infrastructure, zero additional cost!
