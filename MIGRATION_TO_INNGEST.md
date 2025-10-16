# Migration: BullMQ → Inngest

## Why Inngest is Better for You

| Feature | BullMQ | Inngest |
|---------|--------|---------|
| Cost | Need Redis + Worker dyno ($15-30/mo) | Free tier: 50k events/month |
| Scaling | Manual dyno scaling | Automatic serverless |
| Monitoring | Need external tool | Built-in dashboard |
| Retries | Custom configuration | Automatic with backoff |
| Setup | Redis + Worker process | Just add route |
| Development | Need local Redis | Works locally instantly |

## Changes Required

### Files to Create (3 new files)
1. `app/inngest/client.ts` - Inngest client
2. `app/inngest/functions.ts` - Job functions (replaces workers/jobs/)
3. `app/routes/api.inngest.tsx` - Inngest endpoint

### Files to Update (3 files)
1. `app/lib/shopify/webhook-handlers.ts` - Use Inngest instead of BullMQ
2. `app/routes/webhooks.17track.tsx` - Use Inngest instead of BullMQ
3. `package.json` - Add Inngest dependency

### Files to Remove
1. `app/workers/` - Entire directory (replaced by Inngest functions)

## Implementation

I'll create the Inngest versions of your job handlers now.
