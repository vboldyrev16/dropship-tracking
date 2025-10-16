# Shopify Tracking Redaction App - Technical Architecture

## 1. Technology Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Remix (full-stack framework with SSR for App Proxy pages)
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Queue/Worker**: BullMQ with Redis
- **Validation**: Zod
- **HTTP Client**: node-fetch or axios
- **Testing**: Vitest + Supertest

### Infrastructure
- **Hosting**: Railway/Render/Fly.io (MVP), AWS/GCP (production)
- **Database**: Managed Postgres (Railway/Neon/Supabase)
- **Redis**: Managed Redis (Upstash/Railway)
- **Monitoring**: Sentry for errors, basic logs

### Frontend (Public Tracking Page)
- **SSR**: Remix loader + React components
- **Styling**: Tailwind CSS
- **Icons**: Lucide React or Heroicons

---

## 2. File & Folder Structure

```
shopify-tracking-app/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Auto-generated migrations
│
├── app/                           # Remix app directory
│   ├── routes/                    # Route handlers
│   │   ├── apps.track.$trackingNumber.tsx   # Public tracking page (App Proxy)
│   │   ├── apps.track.tsx                   # Search redirect handler
│   │   ├── webhooks.shopify.tsx             # Shopify webhook receiver
│   │   ├── webhooks.17track.tsx             # 17TRACK webhook receiver
│   │   ├── auth.shopify.tsx                 # OAuth flow (begin)
│   │   └── auth.callback.tsx                # OAuth callback
│   │
│   ├── components/                # React components
│   │   ├── tracking/
│   │   │   ├── TrackingHeader.tsx           # Search bar
│   │   │   ├── OrderSummary.tsx             # Order #, status pill, tracking #
│   │   │   ├── LastMileCard.tsx             # Last-mile carrier + link
│   │   │   ├── ProductList.tsx              # Order items
│   │   │   ├── EventTimeline.tsx            # Redacted events list
│   │   │   └── StatusBadge.tsx              # Canonical status pill
│   │   └── ui/
│   │       └── EmptyState.tsx               # Error/not found states
│   │
│   ├── lib/                       # Business logic & utilities
│   │   ├── shopify/
│   │   │   ├── auth.ts                      # OAuth flow helpers
│   │   │   ├── client.ts                    # GraphQL client wrapper
│   │   │   ├── webhooks.ts                  # Webhook verification + registration
│   │   │   └── queries.ts                   # GraphQL query definitions
│   │   │
│   │   ├── providers/
│   │   │   ├── 17track.ts                   # 17TRACK API client
│   │   │   └── types.ts                     # Provider response types
│   │   │
│   │   ├── redaction/
│   │   │   ├── engine.ts                    # Core redaction logic
│   │   │   ├── denylist.ts                  # China-related terms + cities
│   │   │   └── placeholder.ts               # Default messages for empty content
│   │   │
│   │   ├── status/
│   │   │   ├── mapper.ts                    # Provider → canonical status
│   │   │   └── types.ts                     # Status enums
│   │   │
│   │   ├── security/
│   │   │   ├── app-proxy-hmac.ts            # Verify App Proxy signatures
│   │   │   ├── webhook-hmac.ts              # Verify webhook signatures
│   │   │   └── rate-limit.ts                # Basic rate limiting
│   │   │
│   │   └── utils/
│   │       ├── db.ts                        # Prisma client singleton
│   │       ├── logger.ts                    # Structured logging
│   │       └── env.ts                       # Environment variable validation
│   │
│   ├── workers/                   # Background jobs
│   │   ├── queue.ts                         # BullMQ queue setup
│   │   ├── processor.ts                     # Job processor entry point
│   │   ├── jobs/
│   │   │   ├── register-tracking.ts         # Register tracking with 17TRACK
│   │   │   ├── process-event.ts             # Process raw event → redacted
│   │   │   ├── update-tracking-status.ts    # Update canonical status
│   │   │   └── poll-stale-trackings.ts      # Fallback polling (cron-like)
│   │   └── worker.ts                        # Worker process entry (separate process)
│   │
│   └── entry.server.tsx           # Remix SSR entry
│
├── scripts/
│   ├── setup-shop.ts              # Dev tool: simulate shop install
│   └── seed-test-data.ts          # Seed test trackings/events
│
├── tests/
│   ├── unit/
│   │   ├── redaction.test.ts
│   │   ├── status-mapper.test.ts
│   │   └── hmac-verification.test.ts
│   ├── integration/
│   │   ├── shopify-webhook.test.ts
│   │   └── 17track-webhook.test.ts
│   └── e2e/
│       └── tracking-page.test.ts
│
├── .env.example
├── .env                           # Local secrets (git-ignored)
├── package.json
├── tsconfig.json
├── remix.config.js
├── tailwind.config.js
└── README.md
```

---

## 3. Data Model (Prisma Schema)

```prisma
// prisma/schema.prisma

model Shop {
  id            String   @id @default(cuid())
  shopDomain    String   @unique  // e.g., "my-store.myshopify.com"
  accessToken   String   // Encrypted OAuth token
  installedAt   DateTime @default(now())

  orders        Order[]
  trackings     Tracking[]

  @@map("shops")
}

model Order {
  id              String   @id @default(cuid())
  shopId          String
  shopifyOrderId  String   // Shopify's gid or numeric ID
  orderName       String   // e.g., "#1234"

  shop            Shop       @relation(fields: [shopId], references: [id], onDelete: Cascade)
  trackings       Tracking[]

  @@unique([shopId, shopifyOrderId])
  @@index([shopId])
  @@map("orders")
}

model Tracking {
  id                  String   @id @default(cuid())
  shopId              String
  orderId             String?  // Nullable if tracking exists without order context
  trackingNumber      String
  carrierSlug         String?  // e.g., "fedex", "usps" (from Shopify or 17TRACK)
  status              String   @default("ordered")  // Canonical: ordered|order_ready|in_transit|out_for_delivery|delivered
  lastMileSlug        String?  // Last-mile carrier code
  lastMileTracking    String?  // Last-mile tracking number
  lastMileUrl         String?  // Direct link to last-mile tracking page

  registeredWith17Track Boolean @default(false)
  lastPolledAt        DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  shop              Shop          @relation(fields: [shopId], references: [id], onDelete: Cascade)
  order             Order?        @relation(fields: [orderId], references: [id], onDelete: SetNull)
  rawEvents         EventRaw[]
  redactedEvents    EventRedacted[]

  @@unique([shopId, trackingNumber])
  @@index([trackingNumber])
  @@index([shopId, status])
  @@map("trackings")
}

model EventRaw {
  id          String   @id @default(cuid())
  trackingId  String
  provider    String   // "shopify" | "17track"
  payloadJson String   @db.Text  // JSON blob of original event
  occurredAt  DateTime
  createdAt   DateTime @default(now())

  tracking    Tracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)

  @@index([trackingId, occurredAt])
  @@map("events_raw")
}

model EventRedacted {
  id              String   @id @default(cuid())
  trackingId      String
  statusCode      String?  // Provider's status code (for debugging)
  messageRedacted String   @db.Text  // Redacted message text
  cityRedacted    String?  // Redacted city (if available)
  countryRedacted String?  // Redacted country (if available)
  occurredAt      DateTime
  createdAt       DateTime @default(now())

  tracking        Tracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)

  @@index([trackingId, occurredAt(sort: Desc)])
  @@map("events_redacted")
}
```

---

## 4. Core Services & Data Flow

### 4.1 Shopify OAuth & Installation Flow

```
┌─────────────┐
│   Merchant  │
│  (Browser)  │
└──────┬──────┘
       │ 1. Clicks "Install App"
       ▼
┌─────────────────────────────────────┐
│  GET /auth/shopify?shop=store.com   │
│  (Initiate OAuth)                   │
└──────┬──────────────────────────────┘
       │ 2. Redirect to Shopify Auth
       ▼
┌─────────────────────────────────────┐
│   Shopify OAuth Consent Screen      │
└──────┬──────────────────────────────┘
       │ 3. Merchant approves scopes
       ▼
┌─────────────────────────────────────┐
│  GET /auth/callback?code=xxx        │
│  (Exchange code for access_token)   │
└──────┬──────────────────────────────┘
       │ 4. Store shop + token in DB
       │ 5. Register webhooks
       │    - fulfillments/create
       │    - fulfillments/update
       │    - customers/data_request
       │    - customers/redact
       │    - shop/redact
       ▼
┌─────────────────────────────────────┐
│   Redirect to success page          │
└─────────────────────────────────────┘
```

**State**: Shop record created in `shops` table with encrypted `accessToken`.

---

### 4.2 Fulfillment → Tracking Registration Flow

```
┌─────────────────┐
│  Shopify Store  │
│  (Merchant adds │
│  tracking #)    │
└────────┬────────┘
         │ Webhook: fulfillments/create or fulfillments/update
         ▼
┌────────────────────────────────────────┐
│  POST /webhooks/shopify                │
│  1. Verify HMAC                        │
│  2. Parse payload (order ID, tracking) │
└────────┬───────────────────────────────┘
         │ 3. Upsert order + tracking in DB
         ▼
┌────────────────────────────────────────┐
│  Enqueue job: "register-tracking"      │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Worker: process-register-tracking     │
│  1. Call 17TRACK API                   │
│     POST /track/v1/register            │
│     { tracking_number, carrier_code }  │
│  2. Mark registeredWith17Track = true  │
└────────────────────────────────────────┘
```

**State Changes**:
- New `Order` created/updated
- New `Tracking` created with `status = "ordered"`
- Background job registered with BullMQ

---

### 4.3 17TRACK Webhook → Event Processing Flow

```
┌─────────────────┐
│   17TRACK API   │
│  (Push updates) │
└────────┬────────┘
         │ POST /webhooks/17track
         ▼
┌────────────────────────────────────────┐
│  POST /webhooks/17track                │
│  1. Verify signature (if available)   │
│  2. Parse payload (tracking, events)   │
└────────┬───────────────────────────────┘
         │ 3. Store raw event(s) in events_raw
         ▼
┌────────────────────────────────────────┐
│  Enqueue job: "process-event"          │
│  (one per event)                       │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Worker: process-event                 │
│  1. Load raw event                     │
│  2. Apply redaction (engine.ts)        │
│  3. Insert into events_redacted        │
│  4. Trigger status update job          │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Worker: update-tracking-status        │
│  1. Load all redacted events           │
│  2. Determine canonical status         │
│  3. Update tracking.status             │
│  4. Extract last-mile info (if present)│
└────────────────────────────────────────┘
```

**State Changes**:
- New `EventRaw` record(s)
- New `EventRedacted` record(s)
- `Tracking.status` updated (ordered → order_ready → in_transit → out_for_delivery → delivered)
- `Tracking.lastMileSlug`, `lastMileTracking`, `lastMileUrl` populated when detected

---

### 4.4 Public Tracking Page (App Proxy) Flow

```
┌─────────────────┐
│  End Customer   │
│  (Browser)      │
└────────┬────────┘
         │ GET https://store.com/apps/track/AB123456789CN
         ▼
┌────────────────────────────────────────┐
│  Shopify App Proxy                     │
│  Forwards to:                          │
│  https://your-app.com/apps/track/...   │
│  + HMAC signature in headers           │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  GET /apps/track/:trackingNumber       │
│  (Remix loader)                        │
│  1. Verify App Proxy HMAC              │
│  2. Extract shop domain from signature │
│  3. Load tracking + order + events     │
│  4. Return data to component           │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  React SSR: TrackingPage Component     │
│  - TrackingHeader (search)             │
│  - OrderSummary                        │
│  - LastMileCard                        │
│  - ProductList                         │
│  - EventTimeline (redacted events)     │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  HTML sent to customer's browser       │
└────────────────────────────────────────┘
```

**Key Security**:
- HMAC verification using Shopify App secret
- No authentication required for end customer (public page)
- Shop domain extracted from signed params

---

## 5. Key Modules & Responsibilities

### `app/lib/shopify/auth.ts`
- **Purpose**: Handle OAuth flow (begin, callback, token exchange)
- **Functions**:
  - `buildAuthUrl(shop: string): string` - Generate OAuth URL
  - `exchangeCodeForToken(shop: string, code: string): Promise<string>` - Get access token
  - `storeShopCredentials(shop: string, token: string): Promise<void>` - Save to DB

### `app/lib/shopify/client.ts`
- **Purpose**: GraphQL client for Shopify Admin API
- **Functions**:
  - `getOrder(shopId: string, orderId: string): Promise<OrderData>` - Fetch order details
  - `getFulfillment(shopId: string, fulfillmentId: string): Promise<FulfillmentData>` - Fetch fulfillment

### `app/lib/shopify/webhooks.ts`
- **Purpose**: Register and verify Shopify webhooks
- **Functions**:
  - `registerWebhooks(shop: string, accessToken: string): Promise<void>` - Register required webhooks
  - `verifyWebhookHmac(body: string, hmacHeader: string): boolean` - Verify webhook signature

### `app/lib/providers/17track.ts`
- **Purpose**: 17TRACK API integration
- **Functions**:
  - `registerTracking(trackingNumber: string, carrierCode?: string): Promise<void>` - Register tracking
  - `parseWebhookPayload(payload: any): TrackingEvent[]` - Parse webhook data

### `app/lib/redaction/engine.ts`
- **Purpose**: Core redaction logic
- **Functions**:
  - `redactText(text: string, denylist: string[]): string` - Apply redaction to message
  - `shouldUsePlaceholder(redactedText: string): boolean` - Check if message is empty after redaction
  - `applyPlaceholder(original: string): string` - Return neutral message

### `app/lib/redaction/denylist.ts`
- **Purpose**: Maintain list of China-related terms
- **Exports**:
  - `CHINA_DENYLIST`: Array of regex patterns (CN, China, PRC, Shenzhen, Guangzhou, etc.)

### `app/lib/status/mapper.ts`
- **Purpose**: Map provider status codes to canonical status
- **Functions**:
  - `mapToCanonical(providerStatus: string, provider: 'shopify' | '17track'): CanonicalStatus`
  - `extractLastMileInfo(events: any[]): LastMileInfo | null` - Detect last-mile carrier

### `app/lib/security/app-proxy-hmac.ts`
- **Purpose**: Verify App Proxy requests
- **Functions**:
  - `verifyAppProxySignature(queryParams: URLSearchParams, secret: string): boolean`
  - `extractShopDomain(queryParams: URLSearchParams): string | null`

### `app/workers/queue.ts`
- **Purpose**: BullMQ setup and job definitions
- **Exports**:
  - `trackingQueue` - Queue instance for all tracking-related jobs

### `app/workers/jobs/register-tracking.ts`
- **Purpose**: Background job to register tracking with 17TRACK
- **Function**: `processRegisterTracking(job: Job): Promise<void>`

### `app/workers/jobs/process-event.ts`
- **Purpose**: Process raw event → redacted event
- **Function**: `processEvent(job: Job): Promise<void>`
  - Apply redaction
  - Store in `events_redacted`
  - Trigger status update

### `app/workers/jobs/update-tracking-status.ts`
- **Purpose**: Update canonical tracking status
- **Function**: `updateTrackingStatus(trackingId: string): Promise<void>`
  - Load all events
  - Determine latest canonical status
  - Update `tracking.status`

---

## 6. State Management

### Where State Lives

1. **Database (Postgres via Prisma)**
   - **Source of truth** for all persistent data
   - Shop credentials, orders, trackings, events
   - No in-memory caching in MVP (add Redis cache later if needed)

2. **Queue (BullMQ/Redis)**
   - Temporary state for background jobs
   - Job status (waiting, active, completed, failed)
   - Retry logic built into BullMQ

3. **Request Context (Remix Loaders)**
   - Ephemeral state during SSR
   - Loaded from DB per request
   - No client-side state management needed (public page is read-only)

### How Services Connect

```
┌──────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────┬──────────────────────────────────┬──────────────────┘
         │                                  │
         │ Shopify Webhooks          17TRACK Webhooks
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Remix App (Node.js)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes (Webhook Receivers + App Proxy Handler)       │ │
│  └───────────┬──────────────────────────────┬─────────────┘ │
│              │                              │               │
│              ▼                              ▼               │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │  Shopify Client      │      │  17TRACK Client      │    │
│  │  (GraphQL)           │      │  (REST API)          │    │
│  └──────────┬───────────┘      └──────────┬───────────┘    │
│             │                             │                 │
│             ▼                             ▼                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Business Logic (Redaction, Status Mapping, etc.)   │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Prisma ORM                                          │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BullMQ Queue (Enqueue Jobs)                         │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ Redis Connection
                          │
          ┌───────────────┴────────────────┐
          │                                │
          ▼                                ▼
┌─────────────────────┐        ┌──────────────────────┐
│  PostgreSQL         │        │  Redis               │
│  (Persistent Data)  │        │  (Job Queue)         │
└─────────────────────┘        └──────────┬───────────┘
                                          │
                                          │
                    ┌─────────────────────┴──────────┐
                    │  Worker Process (Separate)     │
                    │  - Processes jobs from queue   │
                    │  - Writes back to Postgres     │
                    └────────────────────────────────┘
```

---

## 7. Security Considerations

### Authentication & Authorization
- **Shopify OAuth**: Standard OAuth 2.0 flow with scopes `read_orders`, `read_fulfillments`
- **App Proxy HMAC**: Every public tracking page request verified against Shopify's signature
- **Webhook HMAC**: All Shopify and 17TRACK webhooks verified before processing

### Data Protection
- **Access Tokens**: Encrypted at rest in database
- **No PII on public page**: Only order number, tracking info, product titles (no customer names/addresses)
- **GDPR Compliance**: Webhooks registered for `customers/data_request`, `customers/redact`, `shop/redact`

### Rate Limiting
- Basic rate limiting on public App Proxy routes (per IP)
- Webhook endpoints: idempotent processing to handle retries

---

## 8. Testing Strategy

### Unit Tests
- Redaction engine (various China terms, edge cases)
- Status mapper (provider codes → canonical)
- HMAC verification
- Denylist matching

### Integration Tests
- Shopify webhook processing (mock payloads)
- 17TRACK webhook processing (mock payloads)
- Database operations (Prisma transactions)

### E2E Tests
- Full flow: webhook → job processing → tracking page render
- Search functionality
- Error states (unknown tracking, invalid HMAC)

---

## 9. Deployment Architecture (MVP)

```
┌───────────────────────────────────────────────────────┐
│  Railway / Render / Fly.io                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Web Process (Remix SSR)                        │  │
│  │  - Handles HTTP requests                        │  │
│  │  - Enqueues jobs to BullMQ                      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Worker Process                                 │  │
│  │  - Processes background jobs                    │  │
│  │  - Separate dyno/container                      │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
                    │               │
                    │               │
        ┌───────────┴────┐     ┌────┴─────────┐
        ▼                │     │              ▼
┌────────────────┐       │     │     ┌────────────────┐
│  PostgreSQL    │       │     │     │  Redis         │
│  (Managed)     │       │     │     │  (Upstash)     │
└────────────────┘       │     │     └────────────────┘
                         │     │
                         ▼     ▼
                   ┌──────────────────┐
                   │  Sentry          │
                   │  (Error Tracking)│
                   └──────────────────┘
```

### Environment Variables
```
# Shopify
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
SHOPIFY_SCOPES=read_orders,read_fulfillments

# 17TRACK
SEVENTEEN_TRACK_API_KEY=xxx

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Security
SESSION_SECRET=xxx
ENCRYPTION_KEY=xxx  # For encrypting access tokens

# App
APP_URL=https://your-app.com
NODE_ENV=production
```

---

## 10. Monitoring & Observability

### Key Metrics
- **Coverage**: `% of trackings with lastMileSlug populated`
- **Latency**: `Median time from Shopify fulfillment webhook to first 17TRACK event`
- **Queue Health**: `BullMQ job wait time, failure rate`
- **Redaction Quality**: `% of events redacted (has any redaction applied)`
- **Page Performance**: `App Proxy response time (TTFB)`

### Logging
- Structured JSON logs with correlation IDs
- Log levels: ERROR (Sentry), WARN, INFO, DEBUG
- Key events:
  - Webhook received
  - Job started/completed/failed
  - Status changed
  - Redaction applied

---

## 11. Scalability Considerations (Post-MVP)

### Caching
- Redis cache for tracking page data (TTL: 5 minutes)
- Cache key: `tracking:{shop_id}:{tracking_number}`

### Database Optimization
- Add indexes for hot queries (tracking lookups, event timelines)
- Partition `events_raw` and `events_redacted` by date if volume grows

### Worker Scaling
- Horizontal scaling of worker processes
- Separate queues for critical vs. non-critical jobs

### CDN
- Serve tracking pages via CDN (Cloudflare/Fastly) with short cache TTL

---

## 12. Open Technical Decisions

1. **Encryption for access tokens**: Use `crypto` module with `AES-256-GCM` or dedicated library like `@47ng/cloak`?
2. **Webhook retry strategy**: How many retries for failed 17TRACK registrations? (Proposal: 3 retries with exponential backoff)
3. **Polling fallback**: Run cron job every 6 hours to poll trackings with no events in last 24h?
4. **Session management for OAuth**: Use Remix's built-in session storage or external library?

---

## Summary

This architecture provides:
- **Clear separation of concerns**: Routes handle HTTP, workers handle background jobs, lib/ contains pure business logic
- **Testability**: Each module has single responsibility and clear interfaces
- **Scalability**: Queue-based architecture allows horizontal scaling
- **Security**: HMAC verification at every entry point, encrypted credentials
- **Observability**: Structured logging and key metrics tracked from day one

The MVP focuses on **simplicity and reliability** with room to add complexity (caching, advanced polling, multi-provider support) in later iterations.
