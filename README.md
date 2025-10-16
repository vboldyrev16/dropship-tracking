# Dropshipping Tracking App - Hide China Origin

A Shopify app that provides a branded tracking experience for dropshipping stores while automatically redacting China-related location information from tracking updates.

## Features

- **Automatic Redaction**: Removes references to China, Chinese cities, and related terms from tracking events
- **Real-time Updates**: Integrates with 17TRACK for worldwide shipment tracking
- **Last-Mile Handoff**: Displays local carrier information when packages enter destination country
- **Branded Experience**: Customer-facing tracking page hosted on merchant's domain via Shopify App Proxy
- **Privacy-First**: Stores encrypted Shopify access tokens and handles GDPR data requests

## Architecture

- **Framework**: Remix (React + Server-side rendering)
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ + Redis for background job processing
- **Tracking Provider**: 17TRACK API
- **Deployment**: Heroku, Railway, or Render compatible

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (for production) or SQLite (for development)
- Redis server
- Shopify Partner account
- 17TRACK API account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dropship-tracking-hiding-china
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in required values (see ENV_VARS_CHECKLIST.md for details):
- `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` from Shopify Partners Dashboard
- `SEVENTEEN_TRACK_API_KEY` from 17TRACK
- Generate `SESSION_SECRET` and `ENCRYPTION_KEY`: `openssl rand -base64 32`
- Set `APP_URL` to your development URL (e.g., http://localhost:5173)

4. Set up the database:
```bash
npx prisma migrate dev
npm run seed  # Optional: Load test data
```

5. Start Redis (see REDIS_SETUP.md for options):
```bash
# Option 1: Local Redis
redis-server

# Option 2: Docker
docker run -d -p 6379:6379 redis

# Option 3: Use Upstash (cloud Redis)
```

6. Start the development server:
```bash
npm run dev
```

7. In a separate terminal, start the worker:
```bash
npm run worker
```

The app will be available at http://localhost:5173

## Development

### Project Structure

```
app/
├── components/       # React components
│   ├── tracking/    # Tracking page components
│   └── ui/          # Reusable UI components
├── lib/
│   ├── providers/   # 17TRACK API client
│   ├── redaction/   # Redaction engine and denylist
│   ├── security/    # HMAC, encryption, auth
│   ├── shopify/     # Shopify OAuth and GraphQL
│   ├── status/      # Status mapping logic
│   └── utils/       # Database, logger, env validation
├── routes/          # Remix routes (pages and API)
│   ├── auth.*.tsx   # OAuth flows
│   ├── webhooks.*.tsx # Webhook receivers
│   └── apps.track.*.tsx # Customer-facing tracking
├── styles/          # Tailwind CSS
└── workers/         # BullMQ job handlers
    └── jobs/        # Individual job processors

prisma/
├── schema.prisma    # Database schema
├── migrations/      # Migration files
└── seed.ts          # Test data seeder

tests/
├── unit/            # Unit tests
└── integration/     # Integration tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/redaction/engine.test.ts

# Run with coverage
npm test -- --coverage
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name <migration_name>

# Reset database
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Load test data
npm run seed
```

## Deployment

### Step 1: Configure Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Create a new app or select existing app
3. Under Configuration:
   - Set App URL: `https://yourapp.herokuapp.com`
   - Set Allowed redirection URL(s): `https://yourapp.herokuapp.com/auth/callback`
4. Under App Proxy:
   - Subpath prefix: `/apps/track`
   - Proxy URL: `https://yourapp.herokuapp.com/apps`

### Step 2: Configure 17TRACK

1. Sign up at [17TRACK Developer Portal](https://www.17track.net/en/api)
2. Get your API key
3. Configure webhook URL: `https://yourapp.herokuapp.com/webhooks/17track`

### Step 3: Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables (see ENV_VARS_CHECKLIST.md)
heroku config:set APP_URL=https://your-app-name.herokuapp.com
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set ENCRYPTION_KEY=$(openssl rand -base64 32)
heroku config:set SHOPIFY_API_KEY=your_key
heroku config:set SHOPIFY_API_SECRET=your_secret
heroku config:set SHOPIFY_SCOPES="read_orders,write_orders,read_fulfillments,write_fulfillments"
heroku config:set SEVENTEEN_TRACK_API_KEY=your_key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Scale worker dyno
heroku ps:scale worker=1

# Check logs
heroku logs --tail
```

### Alternative Platforms

See ENV_VARS_CHECKLIST.md for deployment instructions for Railway and Render.

## Usage

### Installing on a Store

1. Visit `https://yourapp.herokuapp.com/auth/shopify?shop=store-name.myshopify.com`
2. Approve the app installation
3. The app will automatically:
   - Register webhooks for fulfillments
   - Start tracking new orders with tracking numbers
   - Register tracking numbers with 17TRACK
   - Redact China-related information from events

### Customer Tracking Experience

Customers can track orders at:
```
https://store-name.myshopify.com/apps/track/<tracking-number>
```

The tracking page displays:
- Order information
- Delivery status with visual badges
- Last-mile carrier information (when available)
- Product list with images
- Timeline of redacted tracking events (no China references)

### Testing

Use the test data created by the seed script:
- Shop: test-store.myshopify.com
- Tracking: TEST123456789CN
- View at: http://localhost:5173/apps/track/TEST123456789CN (with proper HMAC params)

See TESTING_GUIDE.md for detailed testing instructions.

## Monitoring

### Health Check

```bash
curl https://yourapp.herokuapp.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "checks": {
    "database": "ok"
  }
}
```

### Logs

```bash
# Heroku
heroku logs --tail --dyno web
heroku logs --tail --dyno worker

# Check worker status
heroku ps
```

## Troubleshooting

### Common Issues

**OAuth fails with "Unauthorized"**
- Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET match Shopify Partners dashboard
- Check APP_URL is correctly configured in both .env and Shopify settings
- Ensure redirect URL includes /auth/callback

**Webhooks not received**
- Check webhook registration succeeded during install
- Verify HMAC signature validation (check SHOPIFY_API_SECRET)
- Review webhook logs in Shopify Partners dashboard

**Tracking page returns 401**
- App Proxy HMAC verification is failing
- Verify request includes all required query parameters from Shopify
- Check SHOPIFY_API_SECRET is correct

**Worker not processing jobs**
- Ensure worker dyno/process is running: `heroku ps`
- Verify REDIS_URL is accessible
- Check worker logs for errors

**Database connection errors**
- Verify DATABASE_URL is set and correct
- For PostgreSQL, ensure database exists and migrations ran
- Check connection limits haven't been exceeded

See ENV_VARS_CHECKLIST.md and TESTING_GUIDE.md for more troubleshooting tips.

## Security

- All Shopify access tokens are encrypted at rest using AES-256-GCM
- Webhook signatures verified using HMAC-SHA256
- App Proxy requests validated with HMAC signature
- GDPR-compliant with data deletion webhooks
- Environment variables never committed to version control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## License

ISC

## Support

For issues and questions:
- Check TESTING_GUIDE.md for common testing scenarios
- Review ENV_VARS_CHECKLIST.md for environment configuration
- Check REDIS_SETUP.md for Redis setup options
- Review architecture.md for technical architecture details

## Roadmap

- [ ] Support additional tracking providers (AfterShip, Shippo)
- [ ] Customizable redaction rules per merchant
- [ ] Email notifications with redacted tracking updates
- [ ] Analytics dashboard for merchants
- [ ] Multi-language support for tracking pages
- [ ] Mobile app for customer tracking
