# Quick Deploy Reference Card

Copy-paste commands for fast deployment. See DEPLOYMENT_GUIDE.md for full details.

## 1. Deploy to Heroku (5 minutes)

```bash
# Login and create app
heroku login
heroku create your-app-name

# Add database and Redis
heroku addons:create heroku-postgresql:essential-0
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set APP_URL=https://your-app-name.herokuapp.com
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set ENCRYPTION_KEY=$(openssl rand -base64 32)
heroku config:set SHOPIFY_SCOPES="read_orders,write_orders,read_fulfillments,write_fulfillments"
heroku config:set NODE_ENV=production

# Deploy
git init
git add .
git commit -m "Initial deploy"
heroku git:remote -a your-app-name
git push heroku main

# Run migrations and start worker
heroku run npx prisma migrate deploy
heroku ps:scale worker=1

# Test health
curl https://your-app-name.herokuapp.com/health
```

**Save your app URL:** `https://your-app-name.herokuapp.com`

## 2. Configure Shopify (3 minutes)

**Go to:** https://partners.shopify.com/

1. Apps → Create app
2. Set **App URL**: `https://your-app-name.herokuapp.com`
3. Set **Redirect URL**: `https://your-app-name.herokuapp.com/auth/callback`
4. Set **App Proxy**:
   - Subpath prefix: `apps`
   - Subpath: `track`
   - Proxy URL: `https://your-app-name.herokuapp.com/apps`
5. Select scopes: `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`
6. Copy **Client ID** and **Client secret**

```bash
# Update Heroku with Shopify credentials
heroku config:set SHOPIFY_API_KEY=your_client_id
heroku config:set SHOPIFY_API_SECRET=your_client_secret
heroku restart
```

## 3. Configure 17TRACK (2 minutes)

**Go to:** https://www.17track.net/en/api

1. Sign up / Login
2. Get API key
3. Add webhook: `https://your-app-name.herokuapp.com/webhooks/17track`

```bash
# Update Heroku with 17TRACK key
heroku config:set SEVENTEEN_TRACK_API_KEY=your_17track_key
heroku restart
```

## 4. Test Installation (2 minutes)

**Install on development store:**

Visit:
```
https://your-app-name.herokuapp.com/auth/shopify?shop=YOUR_DEV_STORE.myshopify.com
```

Click "Install app"

**Test tracking page:**
```
https://YOUR_DEV_STORE.myshopify.com/apps/track/TEST123456789CN
```

## Installation URL for Merchants

Share this URL with merchants (replace `MERCHANT_STORE`):
```
https://your-app-name.herokuapp.com/auth/shopify?shop=MERCHANT_STORE.myshopify.com
```

## Monitor

```bash
# View logs
heroku logs --tail

# Check status
heroku ps

# Database console
heroku pg:psql
```

## Troubleshooting

**OAuth fails:**
```bash
heroku config:get SHOPIFY_API_KEY
heroku config:get SHOPIFY_API_SECRET
# Verify these match Shopify Partners Dashboard
```

**Webhooks not working:**
```bash
heroku logs --tail | grep webhook
# Check HMAC verification
```

**Worker not running:**
```bash
heroku ps:scale worker=1
heroku logs --tail --dyno worker
```

## Cost

- **Testing**: ~$18/month (Eco dynos + mini add-ons)
- **Production**: ~$79/month (Basic dynos + standard add-ons)

## Done!

Your app is now live and ready for merchants to install.

**Next:** See DEPLOYMENT_GUIDE.md for monitoring, scaling, and launching publicly.
