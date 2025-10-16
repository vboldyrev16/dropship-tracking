# Complete Deployment Guide - Shopify App

This guide walks you through deploying your tracking app to production and making it available as a Shopify app.

## Overview

The deployment process has 4 main steps:
1. Deploy the application to a hosting platform
2. Configure the Shopify app in Partners Dashboard
3. Configure 17TRACK integration
4. Test and launch

## Step 1: Deploy Application to Heroku

### Prerequisites
- Heroku account (free tier works for testing)
- Git installed
- Heroku CLI installed

### 1.1 Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### 1.2 Login and Create App

```bash
# Login to Heroku
heroku login

# Create a new app (choose a unique name)
heroku create your-tracking-app-name

# This will output your app URL, like:
# https://your-tracking-app-name.herokuapp.com
```

**Important:** Save this URL - you'll need it for Shopify configuration.

### 1.3 Add Required Add-ons

```bash
# Add PostgreSQL database
heroku addons:create heroku-postgresql:essential-0

# Add Redis
heroku addons:create heroku-redis:mini
```

### 1.4 Configure Environment Variables

```bash
# Set your Heroku app URL
heroku config:set APP_URL=https://your-tracking-app-name.herokuapp.com

# Generate secure keys
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set ENCRYPTION_KEY=$(openssl rand -base64 32)

# Set Shopify credentials (get these in Step 2)
heroku config:set SHOPIFY_API_KEY=YOUR_CLIENT_ID_HERE
heroku config:set SHOPIFY_API_SECRET=YOUR_CLIENT_SECRET_HERE
heroku config:set SHOPIFY_SCOPES="read_orders,write_orders,read_fulfillments,write_fulfillments"

# Set 17TRACK key (get this in Step 3)
heroku config:set SEVENTEEN_TRACK_API_KEY=YOUR_17TRACK_KEY_HERE

# Set environment
heroku config:set NODE_ENV=production
```

### 1.5 Deploy the Code

```bash
# Make sure you're in the project directory
cd /path/to/dropship-tracking-hiding-china

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Add Heroku remote
heroku git:remote -a your-tracking-app-name

# Deploy
git push heroku main
```

### 1.6 Run Database Migrations

```bash
# Run migrations on Heroku
heroku run npx prisma migrate deploy

# Check logs to verify migration succeeded
heroku logs --tail
```

### 1.7 Scale Worker Process

```bash
# Start the worker dyno for background jobs
heroku ps:scale worker=1

# Verify both web and worker are running
heroku ps
```

Expected output:
```
=== web (Eco): npm run start
web.1: up 2024/01/20 10:00:00 (~ 1m ago)

=== worker (Eco): npm run worker
worker.1: up 2024/01/20 10:00:00 (~ 1m ago)
```

### 1.8 Verify Deployment

```bash
# Check health endpoint
curl https://your-tracking-app-name.herokuapp.com/health

# Expected response:
# {"status":"healthy","timestamp":"2024-01-20T10:00:00.000Z","checks":{"database":"ok"}}
```

## Step 2: Configure Shopify App

### 2.1 Create Shopify Partner Account

1. Go to https://partners.shopify.com/
2. Sign up or login
3. Click "Apps" in the left sidebar
4. Click "Create app"

### 2.2 App Setup

**Basic Information:**
- **App name**: "Private Label Tracking" (or your preferred name)
- **App URL**: `https://your-tracking-app-name.herokuapp.com`

Click "Create app"

### 2.3 Configure App Settings

Navigate to "Configuration" tab:

**App URL:**
```
https://your-tracking-app-name.herokuapp.com
```

**Allowed redirection URL(s):**
```
https://your-tracking-app-name.herokuapp.com/auth/callback
```

**App proxy:**
- Subpath prefix: `apps`
- Subpath: `track`  
- Proxy URL: `https://your-tracking-app-name.herokuapp.com/apps`

### 2.4 Get API Credentials

Still in the Configuration tab:

1. Scroll to "Client credentials"
2. Copy the **Client ID**
3. Copy the **Client secret** (click to reveal)

**Update Heroku with these credentials:**

```bash
heroku config:set SHOPIFY_API_KEY=paste_client_id_here
heroku config:set SHOPIFY_API_SECRET=paste_client_secret_here

# Restart the app to pick up new config
heroku restart
```

### 2.5 Set API Scopes

In the Configuration tab, under "API access scopes":

Select these scopes:
- ✅ `read_orders` - Read order information
- ✅ `write_orders` - Update order information  
- ✅ `read_fulfillments` - Read fulfillment data
- ✅ `write_fulfillments` - Update fulfillments

Click "Save"

## Step 3: Configure 17TRACK Integration

### 3.1 Create 17TRACK Account

1. Go to https://www.17track.net/en/api
2. Click "Sign up" or "Register"
3. Complete registration
4. Login to the API dashboard

### 3.2 Get API Key

1. In the 17TRACK dashboard, go to "API Key Management"
2. Create a new API key
3. Copy the API key

### 3.3 Configure Webhook

1. In 17TRACK dashboard, go to "Webhook Settings"
2. Add webhook URL:
   ```
   https://your-tracking-app-name.herokuapp.com/webhooks/17track
   ```
3. Select events to receive:
   - ✅ Track status update
   - ✅ Track info received
   - ✅ In transit
   - ✅ Delivered
4. Save webhook configuration

### 3.4 Update Heroku

```bash
heroku config:set SEVENTEEN_TRACK_API_KEY=paste_17track_key_here
heroku restart
```

## Step 4: Test the Installation

### 4.1 Create Development Store

1. In Shopify Partners Dashboard, click "Stores"
2. Click "Add store" → "Development store"
3. Fill in store details
4. Click "Save"

### 4.2 Install App on Development Store

**Get Installation URL:**

Your installation URL format:
```
https://your-tracking-app-name.herokuapp.com/auth/shopify?shop=YOUR_DEV_STORE.myshopify.com
```

Replace `YOUR_DEV_STORE` with your development store name.

**Install the App:**

1. Open the installation URL in your browser
2. You'll be redirected to Shopify
3. Review the permissions
4. Click "Install app"
5. You should see "Installation successful!" page

**Check Logs:**
```bash
heroku logs --tail
```

Look for:
- OAuth token exchange success
- Shop created in database
- Webhooks registered successfully

### 4.3 Test with a Real Order

**Create Test Order:**

1. In your development store, go to Products
2. Create a test product
3. Create an order (as a customer or in admin)
4. Fulfill the order with a tracking number

**Add Tracking Number:**

Use a real tracking number from a package you've received, or use test number:
```
TEST123456789CN
```

**Check Processing:**

```bash
# Watch the logs
heroku logs --tail

# You should see:
# - Webhook received from Shopify
# - Order and tracking created
# - Job queued to register with 17TRACK
```

**View Tracking Page:**

To test the tracking page locally with proper HMAC signature:

```bash
# Install the app on your development store first
# Then the tracking page will be accessible at:
https://your-dev-store.myshopify.com/apps/track/TEST123456789CN
```

### 4.4 Verify Database

```bash
# Open Heroku Postgres console
heroku pg:psql

# Check data
SELECT * FROM "Shop";
SELECT * FROM "Order";
SELECT * FROM "Tracking";

# Exit
\q
```

### 4.5 Test Redaction

Once you have real tracking events from 17TRACK:

1. Visit tracking page: `https://your-dev-store.myshopify.com/apps/track/YOUR_TRACKING_NUMBER`
2. Verify events display
3. Confirm no "China", "Shenzhen", or other blacklisted terms appear
4. Check status badge displays correctly
5. Test on mobile device

## Step 5: Launch Options

### Option A: Private/Custom App (Recommended for MVP)

Keep the app private and install only on stores you choose:

**Distribute Installation URL:**
```
https://your-tracking-app-name.herokuapp.com/auth/shopify?shop=MERCHANT_STORE.myshopify.com
```

Send this URL to merchants, replacing `MERCHANT_STORE` with their actual store name.

**Pros:**
- No Shopify review process
- Can iterate quickly
- Full control
- Free to start

**Cons:**
- Manual merchant onboarding
- No App Store discovery
- No billing through Shopify

### Option B: Public App (Shopify App Store)

List your app publicly on the Shopify App Store:

**Requirements:**
1. Privacy policy URL (required)
2. Support email (required)
3. App description and screenshots
4. Pricing plan (can be free)
5. Pass Shopify's app review

**Steps:**

1. Create privacy policy page (host it somewhere)
2. In Partners Dashboard → Apps → Your App → "App listing"
3. Fill in all required fields:
   - App description
   - Screenshots (1600x1200px, at least 3)
   - Support information
   - Privacy policy URL
4. Set pricing (or keep free)
5. Submit for review

**Review Process:**
- Takes 1-2 weeks typically
- Shopify will test your app
- May request changes
- Once approved, app goes live in App Store

## Monitoring & Maintenance

### Check App Health

```bash
# View recent logs
heroku logs --tail

# Check dyno status
heroku ps

# Check database size
heroku pg:info

# Check Redis status
heroku redis:info
```

### Common Issues

**OAuth fails:**
```bash
# Verify credentials match
heroku config:get SHOPIFY_API_KEY
heroku config:get SHOPIFY_API_SECRET

# Check they match Shopify Partners Dashboard
```

**Webhooks not received:**
```bash
# Check webhook registration in Shopify admin
# Settings → Notifications → Webhooks

# Verify HMAC secret is correct
heroku config:get SHOPIFY_API_SECRET
```

**Worker not processing jobs:**
```bash
# Check worker is running
heroku ps

# Scale worker if needed
heroku ps:scale worker=1

# Check Redis connection
heroku redis:info
```

**Database errors:**
```bash
# Run migrations again
heroku run npx prisma migrate deploy

# Check database connection
heroku pg:info
```

### Scaling

As your app grows:

```bash
# Upgrade dynos
heroku ps:resize web=standard-1x
heroku ps:resize worker=standard-1x

# Upgrade database
heroku addons:upgrade heroku-postgresql:standard-0

# Upgrade Redis
heroku addons:upgrade heroku-redis:premium-0

# Add more workers
heroku ps:scale worker=2
```

## Cost Estimate

### Heroku (Monthly)

**Development/Testing:**
- Eco dynos (web + worker): $10/month total
- PostgreSQL Essential: $5/month
- Redis Mini: $3/month
- **Total: ~$18/month**

**Production (small):**
- Basic dynos (web + worker): $14/month total
- PostgreSQL Standard: $50/month
- Redis Premium: $15/month
- **Total: ~$79/month**

**Production (medium):**
- Standard dynos (web + 2 workers): $150/month
- PostgreSQL Standard: $50/month
- Redis Premium: $15/month
- **Total: ~$215/month**

### 17TRACK

- Free tier: 100 requests/day
- Paid plans: Starting at $29/month for 1,000 trackings/month

### Total First Month Cost

For testing: **~$18** (Heroku) + **$0** (17TRACK free tier) = **$18**

## Next Steps

1. ✅ Complete Steps 1-4 above
2. ✅ Test thoroughly on development store
3. ✅ Decide: Private app or public listing
4. ✅ If public: Prepare app listing materials
5. ✅ Set up monitoring (optional: Sentry, LogDNA)
6. ✅ Launch to first merchants
7. ✅ Gather feedback and iterate

## Support Resources

- **Shopify Dev Docs**: https://shopify.dev/docs/apps
- **Heroku Docs**: https://devcenter.heroku.com/
- **17TRACK API**: https://www.17track.net/en/api
- **Your App Logs**: `heroku logs --tail`
- **Your App Dashboard**: https://dashboard.heroku.com/

## Checklist

Before launch:

- [ ] App deployed to Heroku
- [ ] Health check returns 200 OK
- [ ] Shopify app configured with correct URLs
- [ ] API credentials set in Heroku
- [ ] 17TRACK account created and webhook configured
- [ ] App installed on development store successfully
- [ ] Test order with tracking created
- [ ] Tracking page displays correctly
- [ ] Redaction removes China references
- [ ] Mobile view works
- [ ] Worker processes jobs
- [ ] Logs show no errors
- [ ] Database and Redis connected
- [ ] Ready to share with merchants!

---

**Need help?** Check the logs first: `heroku logs --tail`
