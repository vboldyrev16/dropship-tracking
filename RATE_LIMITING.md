# Rate Limiting Considerations

## Webhook Endpoints

### Shopify Webhooks (/webhooks/shopify)
**Do NOT rate limit Shopify webhooks.** 

Reasons:
- Shopify has its own retry mechanism for failed webhooks
- Rate limiting could cause legitimate webhooks to be rejected
- This would result in missed order/fulfillment events
- HMAC verification provides sufficient security

Instead:
- Rely on HMAC signature verification (already implemented)
- Use BullMQ job queue to handle processing asynchronously
- Monitor webhook processing time and queue depth

### 17TRACK Webhooks (/webhooks/17track)
**Consider rate limiting in production.**

Current implementation uses in-memory rate limiter (see app/lib/utils/rate-limiter.ts):
- 100 requests per minute per tracking number
- Suitable for development
- Not suitable for multi-instance deployments

For production, use a Redis-based rate limiter:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

// In webhook handler:
const { success } = await ratelimit.limit(trackingNumber);
if (!success) {
  return json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

## Public Endpoints

### Tracking Page (/apps/track/:trackingNumber)
**Already protected by App Proxy HMAC verification.**

- All requests must come through Shopify's App Proxy
- Shopify validates and signs all requests
- Additional rate limiting not necessary
- HMAC signature verification provides security

### OAuth Endpoints (/auth/*)
**Consider rate limiting login attempts.**

Protection mechanisms:
1. OAuth state parameter (CSRF protection)
2. Shopify's own rate limiting on OAuth endpoints
3. Single-use authorization codes

For additional security in production:
- Monitor failed OAuth attempts
- Alert on suspicious patterns
- Consider IP-based rate limiting for auth endpoints

## API Endpoints (Future)

If adding merchant-facing API endpoints:
- Use Redis-based rate limiter
- Implement per-merchant quotas
- Return standard rate limit headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Monitoring

Track these metrics in production:
- Webhook processing time (p50, p95, p99)
- BullMQ queue depth and wait time
- Failed webhook deliveries
- Failed job processing
- Database connection pool usage

Set up alerts for:
- Queue depth > 1000 jobs
- Average processing time > 5 seconds
- Failed job rate > 5%
- Database connection errors

## Production Rate Limiter Setup

### Option 1: Upstash Rate Limit
```bash
npm install @upstash/ratelimit @upstash/redis
```

### Option 2: rate-limiter-flexible
```bash
npm install rate-limiter-flexible ioredis
```

Example with rate-limiter-flexible:
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'webhook',
  points: 100, // requests
  duration: 60, // per 60 seconds
});

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    await limiter.consume(identifier);
    return true;
  } catch {
    return false;
  }
}
```

## Summary

Current implementation:
- ✅ Shopify webhooks: No rate limiting (by design)
- ✅ App Proxy: Protected by HMAC
- ✅ OAuth: Protected by Shopify
- ⚠️  17TRACK webhooks: In-memory rate limiter (upgrade to Redis for production)

Action items for production:
1. Implement Redis-based rate limiting for 17TRACK webhooks
2. Set up monitoring and alerting
3. Monitor queue depth and processing time
4. Configure auto-scaling based on queue metrics
