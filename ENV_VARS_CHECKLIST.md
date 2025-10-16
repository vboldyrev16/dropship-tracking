# Environment Variables Checklist

## Required for All Environments

### Application
- `APP_URL` - Full URL where the app is deployed (e.g., https://yourapp.herokuapp.com)
- `NODE_ENV` - Environment: "development" or "production"
- `SESSION_SECRET` - Random 32+ character string for session encryption
  - Generate: `openssl rand -base64 32`
- `ENCRYPTION_KEY` - Random 32+ character string for token encryption
  - Generate: `openssl rand -base64 32`

### Database
- `DATABASE_URL` - PostgreSQL connection string for production
  - Format: `postgresql://user:password@host:5432/database?schema=public`
  - For local development with SQLite: `file:./dev.db`

### Redis
- `REDIS_URL` - Redis connection string
  - Format: `redis://user:password@host:6379`
  - For local: `redis://localhost:6379`
  - For Upstash: Use the connection string from Upstash dashboard

### Shopify
- `SHOPIFY_API_KEY` - Your Shopify app's Client ID
  - Get from: Shopify Partners Dashboard > Apps > [Your App] > Configuration
- `SHOPIFY_API_SECRET` - Your Shopify app's Client Secret
  - Get from: Shopify Partners Dashboard > Apps > [Your App] > Configuration
- `SHOPIFY_SCOPES` - OAuth scopes (default: "read_orders,write_orders,read_fulfillments,write_fulfillments")

### 17TRACK
- `SEVENTEEN_TRACK_API_KEY` - API key from 17TRACK
  - Sign up at: https://www.17track.net/en/api
  - Get key from: API Dashboard

## Production-Only Considerations

### Security
- Ensure `SESSION_SECRET` and `ENCRYPTION_KEY` are different from development
- Never commit these values to version control
- Rotate keys periodically

### Database
- Use PostgreSQL in production (not SQLite)
- Enable connection pooling if available
- Set up automated backups

### Redis
- Use a managed Redis service (e.g., Upstash, Redis Cloud)
- Enable persistence if available
- Monitor memory usage

### Shopify
- Update `APP_URL` in Shopify Partners Dashboard:
  - App URL: https://yourapp.herokuapp.com
  - Allowed redirection URLs: https://yourapp.herokuapp.com/auth/callback
  - App Proxy URL: https://yourapp.herokuapp.com/apps
- Enable billing if required

### 17TRACK
- Configure webhook URL in 17TRACK dashboard:
  - Webhook URL: https://yourapp.herokuapp.com/webhooks/17track
- Verify IP whitelist if enabled

## Deployment Platforms

### Heroku
```bash
heroku config:set APP_URL=https://yourapp.herokuapp.com
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set ENCRYPTION_KEY=$(openssl rand -base64 32)
heroku config:set SHOPIFY_API_KEY=your_key
heroku config:set SHOPIFY_API_SECRET=your_secret
heroku config:set SHOPIFY_SCOPES="read_orders,write_orders,read_fulfillments,write_fulfillments"
heroku config:set SEVENTEEN_TRACK_API_KEY=your_key
heroku config:set NODE_ENV=production

# Heroku automatically provisions DATABASE_URL with Postgres addon
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini
```

### Railway
```bash
railway variables set APP_URL=https://yourapp.railway.app
railway variables set SESSION_SECRET=$(openssl rand -base64 32)
railway variables set ENCRYPTION_KEY=$(openssl rand -base64 32)
railway variables set SHOPIFY_API_KEY=your_key
railway variables set SHOPIFY_API_SECRET=your_secret
railway variables set SHOPIFY_SCOPES="read_orders,write_orders,read_fulfillments,write_fulfillments"
railway variables set SEVENTEEN_TRACK_API_KEY=your_key
railway variables set NODE_ENV=production

# Railway auto-provisions Postgres and Redis via plugins
```

### Render
Set environment variables in Render dashboard:
- Go to your service > Environment
- Add each variable listed above
- Render auto-provisions DATABASE_URL with PostgreSQL addon

## Verification Checklist

After deployment, verify:

- [ ] App loads at APP_URL
- [ ] OAuth flow completes successfully
- [ ] Shopify webhooks are registered
- [ ] Database migrations ran successfully
- [ ] Worker process is running
- [ ] Redis connection works
- [ ] 17TRACK API calls succeed
- [ ] Tracking page displays correctly
- [ ] Redaction works on real events
- [ ] Health check endpoint responds

## Troubleshooting

### App won't start
- Check logs: `heroku logs --tail` or platform equivalent
- Verify all required env vars are set
- Ensure DATABASE_URL and REDIS_URL are valid

### OAuth fails
- Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET match Shopify Partners dashboard
- Check APP_URL matches the URL configured in Shopify
- Ensure APP_URL is HTTPS in production

### Webhooks not working
- Verify webhook URLs in Shopify admin
- Check HMAC verification with correct SHOPIFY_API_SECRET
- Review webhook logs in Shopify Partners dashboard

### Worker not processing jobs
- Verify worker dyno/process is running
- Check REDIS_URL is accessible from worker
- Review worker logs for errors
- Test Redis connection: `redis-cli -u $REDIS_URL ping`
