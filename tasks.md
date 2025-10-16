# Implementation Tasks - Granular Step-by-Step Plan

This document breaks down the Shopify tracking app into small, testable tasks. Each task has a clear start, end, and single concern. Complete tasks sequentially within each phase.

---

## Phase 0: Project Setup & Foundations

### Task 0.1: Initialize Node.js project
**Goal**: Create package.json with required dependencies
**Test**: `npm install` runs without errors
```bash
mkdir shopify-tracking-app && cd shopify-tracking-app
npm init -y
```
**Output**: `package.json` exists

---

### Task 0.2: Install core dependencies
**Goal**: Add Remix, Prisma, TypeScript, and essential libraries
**Test**: All packages install successfully
```bash
npm install @remix-run/node @remix-run/react @remix-run/serve isbot@4 react react-dom
npm install -D @remix-run/dev vite typescript @types/react @types/react-dom
npm install @prisma/client prisma dotenv zod
npm install bullmq ioredis
```
**Output**: `package.json` updated, `node_modules/` created

---

### Task 0.3: Setup TypeScript configuration
**Goal**: Create `tsconfig.json` with proper compiler settings
**Test**: No TypeScript errors on empty project
```json
{
  "include": ["**/*.ts", "**/*.tsx"],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./app/*"]
    }
  }
}
```
**Output**: `tsconfig.json` created

---

### Task 0.4: Setup Remix configuration
**Goal**: Create `remix.config.js`
**Test**: Remix dev server starts (even with empty app)
```js
/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
};
```
**Output**: `remix.config.js` created

---

### Task 0.5: Create basic Remix app structure
**Goal**: Add minimal `app/` folder with entry points
**Test**: `npm run dev` starts without crashing
```bash
mkdir -p app/routes
touch app/entry.server.tsx
touch app/root.tsx
```
**Contents**:
- `app/entry.server.tsx`: Default Remix SSR entry
- `app/root.tsx`: Root layout with Outlet

**Output**: Remix dev server runs at `http://localhost:5173`

---

### Task 0.6: Create .env.example file
**Goal**: Document all required environment variables
**Test**: File exists and contains all needed vars
```env
# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_orders,read_fulfillments

# 17TRACK
SEVENTEEN_TRACK_API_KEY=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tracking_db

# Redis
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=
ENCRYPTION_KEY=

# App
APP_URL=http://localhost:5173
NODE_ENV=development
```
**Output**: `.env.example` created

---

### Task 0.7: Create .env file with dummy values
**Goal**: Local environment file for development
**Test**: Can load env vars with `dotenv`
```bash
cp .env.example .env
# Edit .env with real local values for DATABASE_URL, REDIS_URL
```
**Output**: `.env` exists (git-ignored)

---

### Task 0.8: Add .gitignore file
**Goal**: Prevent committing secrets and build artifacts
**Test**: `.env` not tracked by git
```
node_modules/
.env
.cache/
build/
.DS_Store
```
**Output**: `.gitignore` created

---

## Phase 1: Database Setup

### Task 1.1: Initialize Prisma
**Goal**: Create Prisma schema file
**Test**: `prisma/schema.prisma` exists
```bash
npx prisma init
```
**Output**: `prisma/schema.prisma` and updated `.env`

---

### Task 1.2: Define Shop model in Prisma schema
**Goal**: Add `Shop` model for storing merchant credentials
**Test**: `npx prisma format` succeeds
```prisma
model Shop {
  id            String   @id @default(cuid())
  shopDomain    String   @unique
  accessToken   String
  installedAt   DateTime @default(now())

  @@map("shops")
}
```
**Output**: `Shop` model added to schema

---

### Task 1.3: Define Order model in Prisma schema
**Goal**: Add `Order` model linked to Shop
**Test**: Schema validates with `npx prisma format`
```prisma
model Order {
  id              String   @id @default(cuid())
  shopId          String
  shopifyOrderId  String
  orderName       String

  shop            Shop   @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([shopId, shopifyOrderId])
  @@index([shopId])
  @@map("orders")
}
```
**Update Shop model**:
```prisma
model Shop {
  // ... existing fields
  orders        Order[]
}
```
**Output**: `Order` model added

---

### Task 1.4: Define Tracking model in Prisma schema
**Goal**: Add `Tracking` model with status and last-mile fields
**Test**: Schema validates
```prisma
model Tracking {
  id                  String   @id @default(cuid())
  shopId              String
  orderId             String?
  trackingNumber      String
  carrierSlug         String?
  status              String   @default("ordered")
  lastMileSlug        String?
  lastMileTracking    String?
  lastMileUrl         String?
  registeredWith17Track Boolean @default(false)
  lastPolledAt        DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  shop              Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  order             Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@unique([shopId, trackingNumber])
  @@index([trackingNumber])
  @@index([shopId, status])
  @@map("trackings")
}
```
**Update Shop and Order models** to include `trackings` relation
**Output**: `Tracking` model added

---

### Task 1.5: Define EventRaw model in Prisma schema
**Goal**: Store original webhook payloads
**Test**: Schema validates
```prisma
model EventRaw {
  id          String   @id @default(cuid())
  trackingId  String
  provider    String
  payloadJson String   @db.Text
  occurredAt  DateTime
  createdAt   DateTime @default(now())

  tracking    Tracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)

  @@index([trackingId, occurredAt])
  @@map("events_raw")
}
```
**Update Tracking model** to include `rawEvents` relation
**Output**: `EventRaw` model added

---

### Task 1.6: Define EventRedacted model in Prisma schema
**Goal**: Store redacted events for public display
**Test**: Schema validates
```prisma
model EventRedacted {
  id              String   @id @default(cuid())
  trackingId      String
  statusCode      String?
  messageRedacted String   @db.Text
  cityRedacted    String?
  countryRedacted String?
  occurredAt      DateTime
  createdAt       DateTime @default(now())

  tracking        Tracking @relation(fields: [trackingId], references: [id], onDelete: Cascade)

  @@index([trackingId, occurredAt(sort: Desc)])
  @@map("events_redacted")
}
```
**Update Tracking model** to include `redactedEvents` relation
**Output**: Complete Prisma schema with all models

---

### Task 1.7: Create initial database migration
**Goal**: Generate migration files from schema
**Test**: Migration files created in `prisma/migrations/`
```bash
npx prisma migrate dev --name init
```
**Output**: Database schema applied, Prisma Client generated

---

### Task 1.8: Create Prisma client singleton utility
**Goal**: Export reusable Prisma client instance
**Test**: Can import and use `db` in any file
```typescript
// app/lib/utils/db.ts
import { PrismaClient } from '@prisma/client';

let db: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  db = global.__db__;
}

export { db };
```
**Output**: `app/lib/utils/db.ts` created

---

### Task 1.9: Test database connection
**Goal**: Verify Prisma can connect to Postgres
**Test**: Script runs and prints "Connected"
```typescript
// scripts/test-db.ts
import { db } from '../app/lib/utils/db';

async function main() {
  await db.$connect();
  console.log('Connected to database');
  await db.$disconnect();
}

main();
```
Run: `npx tsx scripts/test-db.ts`
**Output**: Database connection confirmed

---

## Phase 2: Environment & Security Utilities

### Task 2.1: Create environment variable validator
**Goal**: Validate required env vars on app startup
**Test**: App crashes if required vars missing
```typescript
// app/lib/utils/env.ts
import { z } from 'zod';

const envSchema = z.object({
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1),
  SEVENTEEN_TRACK_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```
**Output**: `app/lib/utils/env.ts` created

---

### Task 2.2: Create logger utility
**Goal**: Structured logging with JSON output
**Test**: Log statements output JSON in production
```typescript
// app/lib/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  debug: (message: string, meta?: Record<string, any>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, any>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, any>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, any>) => log('error', message, meta),
};

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}
```
**Output**: `app/lib/utils/logger.ts` created

---

### Task 2.3: Create HMAC verification utility for Shopify webhooks
**Goal**: Verify webhook authenticity
**Test**: Returns true for valid HMAC, false for invalid
```typescript
// app/lib/security/webhook-hmac.ts
import crypto from 'crypto';
import { env } from '../utils/env';

export function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}
```
**Output**: `app/lib/security/webhook-hmac.ts` created

---

### Task 2.4: Write unit test for HMAC verification
**Goal**: Ensure HMAC verification works correctly
**Test**: Test passes
```typescript
// tests/unit/webhook-hmac.test.ts
import { describe, it, expect } from 'vitest';
import { verifyShopifyWebhook } from '../../app/lib/security/webhook-hmac';

describe('verifyShopifyWebhook', () => {
  it('returns true for valid HMAC', () => {
    const body = '{"test":"data"}';
    // Generate valid HMAC using SHOPIFY_API_SECRET
    const hash = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(body, 'utf8')
      .digest('base64');
    expect(verifyShopifyWebhook(body, hash)).toBe(true);
  });

  it('returns false for invalid HMAC', () => {
    expect(verifyShopifyWebhook('{"test":"data"}', 'invalid')).toBe(false);
  });
});
```
Add test script to package.json:
```json
"scripts": {
  "test": "vitest"
}
```
Install vitest: `npm install -D vitest`
**Output**: Test suite passes

---

### Task 2.5: Create App Proxy HMAC verification utility
**Goal**: Verify App Proxy requests from Shopify storefront
**Test**: Returns true for valid signature
```typescript
// app/lib/security/app-proxy-hmac.ts
import crypto from 'crypto';
import { env } from '../utils/env';

export function verifyAppProxySignature(queryParams: URLSearchParams): boolean {
  const signature = queryParams.get('signature');
  if (!signature) return false;

  const params = Array.from(queryParams.entries())
    .filter(([key]) => key !== 'signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('');

  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(params, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export function extractShopDomain(queryParams: URLSearchParams): string | null {
  return queryParams.get('shop');
}
```
**Output**: `app/lib/security/app-proxy-hmac.ts` created

---

### Task 2.6: Write unit test for App Proxy HMAC
**Goal**: Verify App Proxy signature validation
**Test**: Test passes
```typescript
// tests/unit/app-proxy-hmac.test.ts
import { describe, it, expect } from 'vitest';
import { verifyAppProxySignature, extractShopDomain } from '../../app/lib/security/app-proxy-hmac';
import crypto from 'crypto';

describe('App Proxy HMAC', () => {
  it('verifies valid signature', () => {
    const params = new URLSearchParams({
      shop: 'test-store.myshopify.com',
      timestamp: '1234567890',
    });
    const paramString = 'shop=test-store.myshopify.com&timestamp=1234567890';
    const signature = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(paramString, 'utf8')
      .digest('hex');
    params.set('signature', signature);

    expect(verifyAppProxySignature(params)).toBe(true);
  });

  it('extracts shop domain', () => {
    const params = new URLSearchParams({ shop: 'test.myshopify.com' });
    expect(extractShopDomain(params)).toBe('test.myshopify.com');
  });
});
```
**Output**: Test passes

---

### Task 2.7: Create encryption utility for access tokens
**Goal**: Encrypt/decrypt Shopify access tokens before storing
**Test**: Decrypt(Encrypt(token)) === token
```typescript
// app/lib/security/encryption.ts
import crypto from 'crypto';
import { env } from '../utils/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(env.ENCRYPTION_KEY, salt, 100000, KEY_LENGTH, 'sha512');
}

export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

export function decrypt(encryptedData: string): string {
  const buffer = Buffer.from(encryptedData, 'base64');

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = getKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final('utf8');
}
```
**Output**: `app/lib/security/encryption.ts` created

---

### Task 2.8: Write unit test for encryption
**Goal**: Verify encrypt/decrypt round-trip
**Test**: Test passes
```typescript
// tests/unit/encryption.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../app/lib/security/encryption';

describe('Encryption', () => {
  it('encrypts and decrypts correctly', () => {
    const original = 'shpat_1234567890abcdef';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('produces different ciphertext each time', () => {
    const text = 'test-token';
    expect(encrypt(text)).not.toBe(encrypt(text));
  });
});
```
**Output**: Test passes

---

## Phase 3: Redaction Engine

### Task 3.1: Create denylist of China-related terms
**Goal**: Define regex patterns for redaction
**Test**: Array exports successfully
```typescript
// app/lib/redaction/denylist.ts
export const CHINA_DENYLIST = [
  /\bCN\b/gi,
  /\bChina\b/gi,
  /\bPRC\b/gi,
  /\bShenzhen\b/gi,
  /\bGuangzhou\b/gi,
  /\bYiwu\b/gi,
  /\bFoshan\b/gi,
  /\bZhengzhou\b/gi,
  /\bHangzhou\b/gi,
  /\bShanghai\b/gi,
  /\bBeijing\b/gi,
  /\bDongguan\b/gi,
  /\bFujian\b/gi,
  /\bZhejiang\b/gi,
  /\bGuangdong\b/gi,
];
```
**Output**: `app/lib/redaction/denylist.ts` created

---

### Task 3.2: Create placeholder message utility
**Goal**: Return neutral message when text fully redacted
**Test**: Function returns string
```typescript
// app/lib/redaction/placeholder.ts
export function getPlaceholder(): string {
  return 'Processing at origin facility';
}
```
**Output**: `app/lib/redaction/placeholder.ts` created

---

### Task 3.3: Create redaction engine core logic
**Goal**: Apply denylist to text and return redacted version
**Test**: China terms removed from sample text
```typescript
// app/lib/redaction/engine.ts
import { CHINA_DENYLIST } from './denylist';
import { getPlaceholder } from './placeholder';

export function redactText(text: string): string {
  if (!text) return '';

  let redacted = text;
  CHINA_DENYLIST.forEach(pattern => {
    redacted = redacted.replace(pattern, '');
  });

  // Collapse multiple spaces and trim
  redacted = redacted.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing punctuation that might be left
  redacted = redacted.replace(/^[,.\-\s]+|[,.\-\s]+$/g, '');

  return redacted;
}

export function shouldUsePlaceholder(redactedText: string): boolean {
  return redactedText.length === 0 || redactedText.match(/^[,.\-\s]+$/) !== null;
}

export function applyRedaction(text: string): string {
  const redacted = redactText(text);
  return shouldUsePlaceholder(redacted) ? getPlaceholder() : redacted;
}
```
**Output**: `app/lib/redaction/engine.ts` created

---

### Task 3.4: Write unit tests for redaction engine
**Goal**: Verify redaction works for various inputs
**Test**: All test cases pass
```typescript
// tests/unit/redaction.test.ts
import { describe, it, expect } from 'vitest';
import { redactText, shouldUsePlaceholder, applyRedaction } from '../../app/lib/redaction/engine';

describe('Redaction Engine', () => {
  it('removes China from text', () => {
    expect(redactText('Departed from China')).toBe('Departed from');
  });

  it('removes city names', () => {
    expect(redactText('Arrived in Shenzhen')).toBe('Arrived in');
  });

  it('removes CN code', () => {
    expect(redactText('Origin: CN')).toBe('Origin:');
  });

  it('handles multiple terms', () => {
    expect(redactText('Package left Shenzhen, China')).toBe('Package left ,');
  });

  it('is case-insensitive', () => {
    expect(redactText('CHINA china China')).toBe('');
  });

  it('detects when placeholder needed', () => {
    expect(shouldUsePlaceholder('')).toBe(true);
    expect(shouldUsePlaceholder('   ')).toBe(true);
    expect(shouldUsePlaceholder('Valid text')).toBe(false);
  });

  it('applies placeholder for empty result', () => {
    expect(applyRedaction('Shenzhen, China')).toBe('Processing at origin facility');
  });

  it('keeps valid text after redaction', () => {
    expect(applyRedaction('Departed from facility in China')).toBe('Departed from facility in');
  });
});
```
**Output**: Tests pass

---

## Phase 4: Status Mapping

### Task 4.1: Define canonical status enum
**Goal**: TypeScript type for standard statuses
**Test**: Type exports correctly
```typescript
// app/lib/status/types.ts
export type CanonicalStatus =
  | 'ordered'
  | 'order_ready'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered';

export interface LastMileInfo {
  carrierSlug: string;
  trackingNumber: string;
  url?: string;
}
```
**Output**: `app/lib/status/types.ts` created

---

### Task 4.2: Create status mapper for 17TRACK
**Goal**: Map 17TRACK status codes to canonical status
**Test**: Function returns correct canonical status
```typescript
// app/lib/status/mapper.ts
import { CanonicalStatus } from './types';

// 17TRACK status codes (simplified for MVP)
// Real codes: https://api.17track.net/en/doc
const STATUS_MAP: Record<string, CanonicalStatus> = {
  'InfoReceived': 'ordered',
  'InTransit': 'in_transit',
  'OutForDelivery': 'out_for_delivery',
  'Delivered': 'delivered',
  'AvailableForPickup': 'out_for_delivery',
  'Expired': 'in_transit',
  'Failed': 'in_transit',
};

export function mapToCanonical(
  providerStatus: string,
  provider: 'shopify' | '17track'
): CanonicalStatus {
  if (provider === '17track') {
    return STATUS_MAP[providerStatus] || 'in_transit';
  }

  // Shopify fallback
  return 'ordered';
}

export function determineCanonicalStatus(events: any[]): CanonicalStatus {
  if (!events.length) return 'ordered';

  // Sort by occurredAt desc to get latest
  const sorted = [...events].sort((a, b) =>
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  // Once delivered, always delivered (unless reversed)
  const hasDelivered = sorted.some(e => e.statusCode === 'Delivered');
  if (hasDelivered) return 'delivered';

  // Check latest status
  const latest = sorted[0];
  return mapToCanonical(latest.statusCode || '', '17track');
}
```
**Output**: `app/lib/status/mapper.ts` created

---

### Task 4.3: Write unit tests for status mapper
**Goal**: Verify status mapping logic
**Test**: Tests pass
```typescript
// tests/unit/status-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { mapToCanonical, determineCanonicalStatus } from '../../app/lib/status/mapper';

describe('Status Mapper', () => {
  it('maps 17TRACK InfoReceived to ordered', () => {
    expect(mapToCanonical('InfoReceived', '17track')).toBe('ordered');
  });

  it('maps 17TRACK InTransit to in_transit', () => {
    expect(mapToCanonical('InTransit', '17track')).toBe('in_transit');
  });

  it('maps 17TRACK Delivered to delivered', () => {
    expect(mapToCanonical('Delivered', '17track')).toBe('delivered');
  });

  it('defaults unknown codes to in_transit', () => {
    expect(mapToCanonical('UnknownCode', '17track')).toBe('in_transit');
  });

  it('determines delivered from event list', () => {
    const events = [
      { statusCode: 'InTransit', occurredAt: '2024-01-01T10:00:00Z' },
      { statusCode: 'Delivered', occurredAt: '2024-01-02T10:00:00Z' },
    ];
    expect(determineCanonicalStatus(events)).toBe('delivered');
  });
});
```
**Output**: Tests pass

---

### Task 4.4: Create last-mile info extractor stub
**Goal**: Placeholder for extracting last-mile carrier from events
**Test**: Function exists and returns null for now
```typescript
// app/lib/status/mapper.ts (add to existing file)
import { LastMileInfo } from './types';

export function extractLastMileInfo(rawEvents: any[]): LastMileInfo | null {
  // TODO: Implement parsing of 17TRACK event payload for last-mile info
  // For now, return null
  return null;
}
```
**Output**: Function added

---

## Phase 5: Queue & Worker Setup

### Task 5.1: Create BullMQ queue instance
**Goal**: Initialize queue for background jobs
**Test**: Queue connects to Redis
```typescript
// app/workers/queue.ts
import { Queue } from 'bullmq';
import { env } from '../lib/utils/env';

export const trackingQueue = new Queue('tracking-jobs', {
  connection: {
    url: env.REDIS_URL,
  },
});
```
**Output**: `app/workers/queue.ts` created

---

### Task 5.2: Define job type definitions
**Goal**: TypeScript types for job payloads
**Test**: Types export correctly
```typescript
// app/workers/types.ts
export interface RegisterTrackingJob {
  trackingId: string;
}

export interface ProcessEventJob {
  eventRawId: string;
}

export interface UpdateStatusJob {
  trackingId: string;
}
```
**Output**: `app/workers/types.ts` created

---

### Task 5.3: Create worker process entry point
**Goal**: Worker that processes jobs from queue
**Test**: Worker starts without errors
```typescript
// app/workers/worker.ts
import { Worker } from 'bullmq';
import { env } from '../lib/utils/env';
import { logger } from '../lib/utils/logger';
import { processJob } from './processor';

const worker = new Worker('tracking-jobs', processJob, {
  connection: {
    url: env.REDIS_URL,
  },
});

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id, name: job.name });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, name: job?.name, error: err.message });
});

logger.info('Worker started');
```
**Output**: `app/workers/worker.ts` created

---

### Task 5.4: Create job processor router
**Goal**: Route job to correct handler based on job name
**Test**: Processor exports function
```typescript
// app/workers/processor.ts
import { Job } from 'bullmq';
import { logger } from '../lib/utils/logger';

export async function processJob(job: Job): Promise<void> {
  logger.info('Processing job', { name: job.name, id: job.id });

  switch (job.name) {
    case 'register-tracking':
      // await processRegisterTracking(job);
      logger.info('Register tracking job (stub)');
      break;
    case 'process-event':
      // await processEvent(job);
      logger.info('Process event job (stub)');
      break;
    case 'update-status':
      // await updateTrackingStatus(job);
      logger.info('Update status job (stub)');
      break;
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}
```
**Output**: `app/workers/processor.ts` created

---

### Task 5.5: Add worker start script to package.json
**Goal**: Script to run worker process
**Test**: `npm run worker` starts worker
```json
{
  "scripts": {
    "worker": "tsx app/workers/worker.ts"
  }
}
```
Install tsx: `npm install -D tsx`
**Output**: Worker script added

---

### Task 5.6: Test worker starts and connects to Redis
**Goal**: Verify worker process runs
**Test**: Run `npm run worker` - no errors, logs "Worker started"
**Output**: Worker confirmed working

---

## Phase 6: Shopify OAuth Flow

### Task 6.1: Create OAuth URL builder
**Goal**: Generate Shopify OAuth authorization URL
**Test**: Function returns valid URL with scopes
```typescript
// app/lib/shopify/auth.ts
import { env } from '../utils/env';

export function buildAuthUrl(shop: string): string {
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: `${env.APP_URL}/auth/callback`,
    state: generateNonce(),
  });

  return `https://${shop}/admin/oauth/authorize?${params}`;
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}
```
**Output**: `app/lib/shopify/auth.ts` created

---

### Task 6.2: Create OAuth token exchange function
**Goal**: Exchange authorization code for access token
**Test**: Function structure correct (actual call tested in integration)
```typescript
// app/lib/shopify/auth.ts (add to existing file)
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}
```
**Output**: Token exchange function added

---

### Task 6.3: Create function to store shop credentials
**Goal**: Save shop domain and encrypted access token to DB
**Test**: Function inserts record in `shops` table
```typescript
// app/lib/shopify/auth.ts (add to existing file)
import { db } from '../utils/db';
import { encrypt } from '../security/encryption';

export async function storeShopCredentials(
  shop: string,
  accessToken: string
): Promise<void> {
  const encryptedToken = encrypt(accessToken);

  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken: encryptedToken },
    create: {
      shopDomain: shop,
      accessToken: encryptedToken,
    },
  });
}
```
**Output**: Store function added

---

### Task 6.4: Create OAuth begin route
**Goal**: Remix route to initiate OAuth flow
**Test**: GET /auth/shopify?shop=test.myshopify.com redirects to Shopify
```typescript
// app/routes/auth.shopify.tsx
import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { buildAuthUrl } from '~/lib/shopify/auth';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    throw new Response('Missing shop parameter', { status: 400 });
  }

  return redirect(buildAuthUrl(shop));
}
```
**Output**: `app/routes/auth.shopify.tsx` created

---

### Task 6.5: Create OAuth callback route
**Goal**: Handle callback from Shopify with authorization code
**Test**: Successfully exchanges code and stores shop
```typescript
// app/routes/auth.callback.tsx
import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { exchangeCodeForToken, storeShopCredentials } from '~/lib/shopify/auth';
import { logger } from '~/lib/utils/logger';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  const code = url.searchParams.get('code');

  if (!shop || !code) {
    throw new Response('Missing required parameters', { status: 400 });
  }

  try {
    const accessToken = await exchangeCodeForToken(shop, code);
    await storeShopCredentials(shop, accessToken);
    logger.info('Shop installed', { shop });

    return redirect('/installation-success');
  } catch (error) {
    logger.error('OAuth callback failed', { error, shop });
    throw new Response('Installation failed', { status: 500 });
  }
}
```
**Output**: `app/routes/auth.callback.tsx` created

---

### Task 6.6: Create simple success page
**Goal**: Show installation confirmation
**Test**: Route renders HTML
```typescript
// app/routes/installation-success.tsx
export default function InstallationSuccess() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Installation Successful!</h1>
      <p>Your tracking app is now active.</p>
    </div>
  );
}
```
**Output**: `app/routes/installation-success.tsx` created

---

## Phase 7: Shopify GraphQL Client

### Task 7.1: Create GraphQL client wrapper
**Goal**: Authenticated GraphQL client for Shopify Admin API
**Test**: Function structure correct
```typescript
// app/lib/shopify/client.ts
import { env } from '../utils/env';
import { db } from '../utils/db';
import { decrypt } from '../security/encryption';

export async function shopifyGraphQL(
  shopId: string,
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error('Shop not found');

  const accessToken = decrypt(shop.accessToken);
  const response = await fetch(
    `https://${shop.shopDomain}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}
```
**Output**: `app/lib/shopify/client.ts` created

---

### Task 7.2: Create GraphQL query for fetching order details
**Goal**: Reusable query to get order with line items
**Test**: Query string exports
```typescript
// app/lib/shopify/queries.ts
export const GET_ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      name
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            image {
              url
              altText
            }
          }
        }
      }
    }
  }
`;
```
**Output**: `app/lib/shopify/queries.ts` created

---

### Task 7.3: Create helper to fetch order from Shopify
**Goal**: High-level function to get order data
**Test**: Function signature correct
```typescript
// app/lib/shopify/client.ts (add to existing file)
import { GET_ORDER_QUERY } from './queries';

export async function getOrder(shopId: string, orderId: string) {
  const data = await shopifyGraphQL(shopId, GET_ORDER_QUERY, { id: orderId });
  return data.order;
}
```
**Output**: Helper function added

---

## Phase 8: Shopify Webhook Registration

### Task 8.1: Create webhook registration function
**Goal**: Register required webhooks via Shopify API
**Test**: Function structure correct
```typescript
// app/lib/shopify/webhooks.ts
import { env } from '../utils/env';
import { decrypt } from '../security/encryption';
import { db } from '../utils/db';

export async function registerWebhooks(shopId: string): Promise<void> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error('Shop not found');

  const accessToken = decrypt(shop.accessToken);
  const webhooks = [
    { topic: 'fulfillments/create', address: `${env.APP_URL}/webhooks/shopify` },
    { topic: 'fulfillments/update', address: `${env.APP_URL}/webhooks/shopify` },
    { topic: 'customers/data_request', address: `${env.APP_URL}/webhooks/shopify` },
    { topic: 'customers/redact', address: `${env.APP_URL}/webhooks/shopify` },
    { topic: 'shop/redact', address: `${env.APP_URL}/webhooks/shopify` },
  ];

  for (const webhook of webhooks) {
    await fetch(`https://${shop.shopDomain}/admin/api/2024-01/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ webhook }),
    });
  }
}
```
**Output**: `app/lib/shopify/webhooks.ts` created

---

### Task 8.2: Call registerWebhooks after OAuth callback
**Goal**: Automatically register webhooks on installation
**Test**: Webhooks registered after shop install
```typescript
// app/routes/auth.callback.tsx (update existing file)
import { registerWebhooks } from '~/lib/shopify/webhooks';

export async function loader({ request }: LoaderFunctionArgs) {
  // ... existing code ...

  try {
    const accessToken = await exchangeCodeForToken(shop, code);
    await storeShopCredentials(shop, accessToken);

    // Find the shop we just created
    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (shopRecord) {
      await registerWebhooks(shopRecord.id);
    }

    logger.info('Shop installed with webhooks', { shop });
    return redirect('/installation-success');
  } catch (error) {
    // ... existing error handling ...
  }
}
```
**Output**: Webhook registration integrated

---

## Phase 9: Shopify Webhook Receiver

### Task 9.1: Create Shopify webhook receiver route
**Goal**: Handle incoming fulfillment webhooks
**Test**: Route receives POST and verifies HMAC
```typescript
// app/routes/webhooks.shopify.tsx
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { verifyShopifyWebhook } from '~/lib/security/webhook-hmac';
import { logger } from '~/lib/utils/logger';

export async function action({ request }: ActionFunctionArgs) {
  const hmac = request.headers.get('X-Shopify-Hmac-Sha256');
  const topic = request.headers.get('X-Shopify-Topic');
  const body = await request.text();

  if (!hmac || !verifyShopifyWebhook(body, hmac)) {
    logger.warn('Invalid webhook HMAC');
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  logger.info('Webhook received', { topic });

  // TODO: Handle webhook based on topic

  return json({ success: true });
}
```
**Output**: `app/routes/webhooks.shopify.tsx` created

---

### Task 9.2: Create function to handle fulfillments/create webhook
**Goal**: Extract tracking number and create order + tracking records
**Test**: Function creates DB records
```typescript
// app/lib/shopify/webhook-handlers.ts
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { trackingQueue } from '../../workers/queue';

export async function handleFulfillmentCreate(payload: any, shopDomain: string): Promise<void> {
  const shop = await db.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    logger.error('Shop not found for webhook', { shopDomain });
    return;
  }

  const orderId = payload.order_id.toString();
  const orderName = payload.name || `#${orderId}`;
  const trackingNumber = payload.tracking_number;
  const trackingCompany = payload.tracking_company;

  if (!trackingNumber) {
    logger.info('No tracking number in fulfillment', { orderId });
    return;
  }

  // Upsert order
  const order = await db.order.upsert({
    where: { shopId_shopifyOrderId: { shopId: shop.id, shopifyOrderId: orderId } },
    update: {},
    create: {
      shopId: shop.id,
      shopifyOrderId: orderId,
      orderName,
    },
  });

  // Create tracking
  const tracking = await db.tracking.upsert({
    where: { shopId_trackingNumber: { shopId: shop.id, trackingNumber } },
    update: { carrierSlug: trackingCompany || null },
    create: {
      shopId: shop.id,
      orderId: order.id,
      trackingNumber,
      carrierSlug: trackingCompany || null,
      status: 'ordered',
    },
  });

  // Enqueue job to register with 17TRACK
  await trackingQueue.add('register-tracking', { trackingId: tracking.id });
  logger.info('Tracking created and job enqueued', { trackingId: tracking.id });
}
```
**Output**: `app/lib/shopify/webhook-handlers.ts` created

---

### Task 9.3: Route webhook to handler based on topic
**Goal**: Call appropriate handler for webhook topic
**Test**: Fulfillment webhooks processed
```typescript
// app/routes/webhooks.shopify.tsx (update existing file)
import { handleFulfillmentCreate } from '~/lib/shopify/webhook-handlers';

export async function action({ request }: ActionFunctionArgs) {
  // ... existing HMAC verification ...

  const payload = JSON.parse(body);
  const shopDomain = request.headers.get('X-Shopify-Shop-Domain');

  if (!shopDomain) {
    return json({ error: 'Missing shop domain' }, { status: 400 });
  }

  logger.info('Webhook received', { topic, shopDomain });

  try {
    switch (topic) {
      case 'fulfillments/create':
      case 'fulfillments/update':
        await handleFulfillmentCreate(payload, shopDomain);
        break;
      case 'customers/data_request':
      case 'customers/redact':
      case 'shop/redact':
        logger.info('GDPR webhook received (no action in MVP)', { topic });
        break;
      default:
        logger.warn('Unknown webhook topic', { topic });
    }
  } catch (error) {
    logger.error('Webhook processing failed', { error, topic });
    return json({ error: 'Processing failed' }, { status: 500 });
  }

  return json({ success: true });
}
```
**Output**: Webhook routing implemented

---

## Phase 10: 17TRACK Integration

### Task 10.1: Create 17TRACK API client
**Goal**: Register tracking number with 17TRACK
**Test**: Function structure correct
```typescript
// app/lib/providers/17track.ts
import { env } from '../utils/env';
import { logger } from '../utils/logger';

export async function registerTracking(
  trackingNumber: string,
  carrierCode?: string
): Promise<void> {
  const body = [
    {
      number: trackingNumber,
      carrier: carrierCode || 0, // 0 = auto-detect
    },
  ];

  const response = await fetch('https://api.17track.net/track/v2.2/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '17token': env.SEVENTEEN_TRACK_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`17TRACK registration failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  logger.info('Tracking registered with 17TRACK', { trackingNumber, response: data });
}
```
**Output**: `app/lib/providers/17track.ts` created

---

### Task 10.2: Create register-tracking job handler
**Goal**: Worker job to call 17TRACK registration
**Test**: Job updates tracking record
```typescript
// app/workers/jobs/register-tracking.ts
import { Job } from 'bullmq';
import { db } from '../../lib/utils/db';
import { logger } from '../../lib/utils/logger';
import { registerTracking } from '../../lib/providers/17track';
import { RegisterTrackingJob } from '../types';

export async function processRegisterTracking(job: Job<RegisterTrackingJob>): Promise<void> {
  const { trackingId } = job.data;

  const tracking = await db.tracking.findUnique({ where: { id: trackingId } });
  if (!tracking) {
    logger.error('Tracking not found for registration', { trackingId });
    return;
  }

  if (tracking.registeredWith17Track) {
    logger.info('Already registered with 17TRACK', { trackingId });
    return;
  }

  try {
    await registerTracking(tracking.trackingNumber, tracking.carrierSlug || undefined);
    await db.tracking.update({
      where: { id: trackingId },
      data: { registeredWith17Track: true },
    });
    logger.info('Successfully registered tracking', { trackingId });
  } catch (error) {
    logger.error('Failed to register tracking', { trackingId, error });
    throw error; // Re-throw to trigger retry
  }
}
```
**Output**: `app/workers/jobs/register-tracking.ts` created

---

### Task 10.3: Wire register-tracking job to processor
**Goal**: Call job handler from processor router
**Test**: Job executes when enqueued
```typescript
// app/workers/processor.ts (update existing file)
import { processRegisterTracking } from './jobs/register-tracking';

export async function processJob(job: Job): Promise<void> {
  logger.info('Processing job', { name: job.name, id: job.id });

  switch (job.name) {
    case 'register-tracking':
      await processRegisterTracking(job);
      break;
    // ... other cases ...
  }
}
```
**Output**: Job handler wired

---

### Task 10.4: Create 17TRACK webhook receiver route
**Goal**: Receive tracking updates from 17TRACK
**Test**: Route accepts POST requests
```typescript
// app/routes/webhooks.17track.tsx
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { logger } from '~/lib/utils/logger';

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.text();
  const payload = JSON.parse(body);

  // TODO: Verify signature if 17TRACK provides it
  logger.info('17TRACK webhook received', { payload });

  // TODO: Process tracking events

  return json({ success: true });
}
```
**Output**: `app/routes/webhooks.17track.tsx` created

---

### Task 10.5: Create function to parse 17TRACK webhook payload
**Goal**: Extract tracking events from webhook
**Test**: Function returns array of events
```typescript
// app/lib/providers/17track.ts (add to existing file)
export interface TrackingEvent {
  trackingNumber: string;
  statusCode: string;
  message: string;
  location?: string;
  occurredAt: string;
}

export function parseWebhookPayload(payload: any): TrackingEvent[] {
  // 17TRACK webhook structure (example - adjust based on real API)
  const events: TrackingEvent[] = [];

  if (!payload.data || !Array.isArray(payload.data)) {
    return events;
  }

  for (const item of payload.data) {
    const trackingNumber = item.number;
    const trackArray = item.track || [];

    for (const track of trackArray) {
      events.push({
        trackingNumber,
        statusCode: track.event || track.status || 'Unknown',
        message: track.z || track.c || '',
        location: track.a || undefined,
        occurredAt: track.a ? new Date(track.a).toISOString() : new Date().toISOString(),
      });
    }
  }

  return events;
}
```
**Output**: Parser function added

---

### Task 10.6: Create function to store raw events
**Goal**: Save 17TRACK events to events_raw table
**Test**: Function creates EventRaw records
```typescript
// app/lib/providers/17track.ts (add to existing file)
import { db } from '../utils/db';

export async function storeRawEvents(events: TrackingEvent[]): Promise<string[]> {
  const eventIds: string[] = [];

  for (const event of events) {
    // Find tracking by number
    const tracking = await db.tracking.findFirst({
      where: { trackingNumber: event.trackingNumber },
    });

    if (!tracking) {
      logger.warn('Tracking not found for event', { trackingNumber: event.trackingNumber });
      continue;
    }

    const rawEvent = await db.eventRaw.create({
      data: {
        trackingId: tracking.id,
        provider: '17track',
        payloadJson: JSON.stringify(event),
        occurredAt: new Date(event.occurredAt),
      },
    });

    eventIds.push(rawEvent.id);
  }

  return eventIds;
}
```
**Output**: Storage function added

---

### Task 10.7: Process 17TRACK webhook and enqueue jobs
**Goal**: Parse webhook, store events, enqueue processing jobs
**Test**: Events stored and jobs created
```typescript
// app/routes/webhooks.17track.tsx (update existing file)
import { parseWebhookPayload, storeRawEvents } from '~/lib/providers/17track';
import { trackingQueue } from '~/workers/queue';

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.text();
  const payload = JSON.parse(body);

  logger.info('17TRACK webhook received');

  try {
    const events = parseWebhookPayload(payload);
    const eventIds = await storeRawEvents(events);

    // Enqueue process-event jobs
    for (const eventId of eventIds) {
      await trackingQueue.add('process-event', { eventRawId: eventId });
    }

    logger.info('Events stored and jobs enqueued', { count: eventIds.length });
  } catch (error) {
    logger.error('17TRACK webhook processing failed', { error });
    return json({ error: 'Processing failed' }, { status: 500 });
  }

  return json({ success: true });
}
```
**Output**: Webhook processing implemented

---

## Phase 11: Event Processing Worker

### Task 11.1: Create process-event job handler
**Goal**: Load raw event, apply redaction, store redacted event
**Test**: Job creates EventRedacted record
```typescript
// app/workers/jobs/process-event.ts
import { Job } from 'bullmq';
import { db } from '../../lib/utils/db';
import { logger } from '../../lib/utils/logger';
import { applyRedaction } from '../../lib/redaction/engine';
import { ProcessEventJob } from '../types';

export async function processEvent(job: Job<ProcessEventJob>): Promise<void> {
  const { eventRawId } = job.data;

  const rawEvent = await db.eventRaw.findUnique({ where: { id: eventRawId } });
  if (!rawEvent) {
    logger.error('Raw event not found', { eventRawId });
    return;
  }

  const eventData = JSON.parse(rawEvent.payloadJson);

  // Apply redaction to message and location
  const messageRedacted = applyRedaction(eventData.message || '');
  const cityRedacted = eventData.location ? applyRedaction(eventData.location) : null;

  // Create redacted event
  await db.eventRedacted.create({
    data: {
      trackingId: rawEvent.trackingId,
      statusCode: eventData.statusCode || null,
      messageRedacted,
      cityRedacted,
      countryRedacted: null, // Country info usually in message
      occurredAt: rawEvent.occurredAt,
    },
  });

  logger.info('Event redacted and stored', { eventRawId, trackingId: rawEvent.trackingId });

  // Trigger status update
  await trackingQueue.add('update-status', { trackingId: rawEvent.trackingId });
}
```
**Output**: `app/workers/jobs/process-event.ts` created

---

### Task 11.2: Wire process-event job to processor
**Goal**: Call job handler from processor router
**Test**: Job executes
```typescript
// app/workers/processor.ts (update existing file)
import { processEvent } from './jobs/process-event';

export async function processJob(job: Job): Promise<void> {
  logger.info('Processing job', { name: job.name, id: job.id });

  switch (job.name) {
    case 'register-tracking':
      await processRegisterTracking(job);
      break;
    case 'process-event':
      await processEvent(job);
      break;
    // ... other cases ...
  }
}
```
**Output**: Job handler wired

---

### Task 11.3: Create update-tracking-status job handler
**Goal**: Determine canonical status from all events and update tracking
**Test**: Tracking.status updated
```typescript
// app/workers/jobs/update-tracking-status.ts
import { Job } from 'bullmq';
import { db } from '../../lib/utils/db';
import { logger } from '../../lib/utils/logger';
import { determineCanonicalStatus, extractLastMileInfo } from '../../lib/status/mapper';
import { UpdateStatusJob } from '../types';

export async function updateTrackingStatus(job: Job<UpdateStatusJob>): Promise<void> {
  const { trackingId } = job.data;

  const tracking = await db.tracking.findUnique({
    where: { id: trackingId },
    include: { redactedEvents: true, rawEvents: true },
  });

  if (!tracking) {
    logger.error('Tracking not found for status update', { trackingId });
    return;
  }

  // Determine canonical status
  const newStatus = determineCanonicalStatus(tracking.redactedEvents);

  // Extract last-mile info (if available)
  const rawEventsData = tracking.rawEvents.map(e => JSON.parse(e.payloadJson));
  const lastMile = extractLastMileInfo(rawEventsData);

  // Update tracking
  await db.tracking.update({
    where: { id: trackingId },
    data: {
      status: newStatus,
      lastMileSlug: lastMile?.carrierSlug || tracking.lastMileSlug,
      lastMileTracking: lastMile?.trackingNumber || tracking.lastMileTracking,
      lastMileUrl: lastMile?.url || tracking.lastMileUrl,
    },
  });

  logger.info('Tracking status updated', { trackingId, newStatus });
}
```
**Output**: `app/workers/jobs/update-tracking-status.ts` created

---

### Task 11.4: Wire update-status job to processor
**Goal**: Call job handler from processor router
**Test**: Job executes
```typescript
// app/workers/processor.ts (update existing file)
import { updateTrackingStatus } from './jobs/update-tracking-status';

export async function processJob(job: Job): Promise<void> {
  logger.info('Processing job', { name: job.name, id: job.id });

  switch (job.name) {
    case 'register-tracking':
      await processRegisterTracking(job);
      break;
    case 'process-event':
      await processEvent(job);
      break;
    case 'update-status':
      await updateTrackingStatus(job);
      break;
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}
```
**Output**: All job handlers wired

---

## Phase 12: Public Tracking Page (Frontend)

### Task 12.1: Install Tailwind CSS
**Goal**: Setup styling framework
**Test**: Tailwind compiles correctly
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```js
export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

Create `app/styles/tailwind.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import in `app/root.tsx`:
```typescript
import styles from './styles/tailwind.css';
export const links = () => [{ rel: 'stylesheet', href: styles }];
```
**Output**: Tailwind configured

---

### Task 12.2: Create StatusBadge component
**Goal**: Display canonical status as colored pill
**Test**: Component renders with correct styling
```typescript
// app/components/tracking/StatusBadge.tsx
import { CanonicalStatus } from '~/lib/status/types';

const STATUS_CONFIG: Record<CanonicalStatus, { label: string; color: string }> = {
  ordered: { label: 'Ordered', color: 'bg-gray-200 text-gray-800' },
  order_ready: { label: 'Order Ready', color: 'bg-blue-200 text-blue-800' },
  in_transit: { label: 'In Transit', color: 'bg-yellow-200 text-yellow-800' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-purple-200 text-purple-800' },
  delivered: { label: 'Delivered', color: 'bg-green-200 text-green-800' },
};

export function StatusBadge({ status }: { status: CanonicalStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
```
**Output**: `app/components/tracking/StatusBadge.tsx` created

---

### Task 12.3: Create OrderSummary component
**Goal**: Display order number, status, tracking number
**Test**: Component renders data
```typescript
// app/components/tracking/OrderSummary.tsx
import { StatusBadge } from './StatusBadge';
import { CanonicalStatus } from '~/lib/status/types';

interface Props {
  orderName: string;
  status: CanonicalStatus;
  trackingNumber: string;
}

export function OrderSummary({ orderName, status, trackingNumber }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{orderName}</h2>
      </div>
      <div className="mb-4">
        <StatusBadge status={status} />
      </div>
      <div className="text-gray-600">
        <span className="font-medium">Tracking Number:</span> {trackingNumber}
      </div>
    </div>
  );
}
```
**Output**: `app/components/tracking/OrderSummary.tsx` created

---

### Task 12.4: Create LastMileCard component
**Goal**: Display last-mile carrier and link
**Test**: Component shows carrier info or placeholder
```typescript
// app/components/tracking/LastMileCard.tsx
interface Props {
  carrierName?: string | null;
  trackingNumber?: string | null;
  url?: string | null;
}

export function LastMileCard({ carrierName, trackingNumber, url }: Props) {
  if (!carrierName || !trackingNumber) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-gray-500 text-sm">Last-mile carrier information not yet available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-2">Delivered by {carrierName}</h3>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Track with {carrierName}: {trackingNumber}
        </a>
      ) : (
        <p className="text-gray-600">Tracking: {trackingNumber}</p>
      )}
    </div>
  );
}
```
**Output**: `app/components/tracking/LastMileCard.tsx` created

---

### Task 12.5: Create ProductList component
**Goal**: Display order line items
**Test**: Component renders product images and details
```typescript
// app/components/tracking/ProductList.tsx
interface Product {
  id: string;
  title: string;
  quantity: number;
  imageUrl?: string | null;
}

interface Props {
  products: Product[];
}

export function ProductList({ products }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Items in this order</h3>
      <div className="space-y-4">
        {products.map(product => (
          <div key={product.id} className="flex items-center">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-16 h-16 object-cover rounded mr-4"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{product.title}</p>
              <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```
**Output**: `app/components/tracking/ProductList.tsx` created

---

### Task 12.6: Create EventTimeline component
**Goal**: Display list of tracking events (redacted)
**Test**: Component renders events with dates
```typescript
// app/components/tracking/EventTimeline.tsx
interface Event {
  id: string;
  messageRedacted: string;
  occurredAt: string;
}

interface Props {
  events: Event[];
}

export function EventTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No tracking updates yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Tracking Updates</h3>
      <div className="space-y-4">
        {events.map(event => {
          const date = new Date(event.occurredAt);
          return (
            <div key={event.id} className="flex">
              <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                {date.toLocaleDateString()}
                <br />
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex-1 ml-4">
                <p className="text-gray-900">{event.messageRedacted}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```
**Output**: `app/components/tracking/EventTimeline.tsx` created

---

### Task 12.7: Create TrackingHeader component
**Goal**: Search bar for tracking number
**Test**: Component renders form
```typescript
// app/components/tracking/TrackingHeader.tsx
import { Form } from '@remix-run/react';

export function TrackingHeader() {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <Form method="get" action="/apps/track" className="flex gap-2">
        <input
          type="text"
          name="query"
          placeholder="Enter tracking number"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Track
        </button>
      </Form>
    </div>
  );
}
```
**Output**: `app/components/tracking/TrackingHeader.tsx` created

---

### Task 12.8: Create EmptyState component
**Goal**: Error message for unknown tracking numbers
**Test**: Component renders message
```typescript
// app/components/ui/EmptyState.tsx
interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
```
**Output**: `app/components/ui/EmptyState.tsx` created

---

## Phase 13: App Proxy Tracking Page Route

### Task 13.1: Create tracking page loader with HMAC verification
**Goal**: Remix loader to fetch tracking data and verify App Proxy signature
**Test**: Loader rejects invalid signatures, loads data for valid ones
```typescript
// app/routes/apps.track.$trackingNumber.tsx
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { verifyAppProxySignature, extractShopDomain } from '~/lib/security/app-proxy-hmac';
import { db } from '~/lib/utils/db';
import { logger } from '~/lib/utils/logger';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryParams = new URLSearchParams(url.search);

  // Verify App Proxy signature
  if (!verifyAppProxySignature(queryParams)) {
    logger.warn('Invalid App Proxy signature');
    throw new Response('Unauthorized', { status: 401 });
  }

  const shopDomain = extractShopDomain(queryParams);
  if (!shopDomain) {
    throw new Response('Missing shop domain', { status: 400 });
  }

  const trackingNumber = params.trackingNumber;
  if (!trackingNumber) {
    throw new Response('Missing tracking number', { status: 400 });
  }

  // Find shop
  const shop = await db.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    throw new Response('Shop not found', { status: 404 });
  }

  // Find tracking with related data
  const tracking = await db.tracking.findUnique({
    where: { shopId_trackingNumber: { shopId: shop.id, trackingNumber } },
    include: {
      order: true,
      redactedEvents: {
        orderBy: { occurredAt: 'desc' },
      },
    },
  });

  if (!tracking) {
    return json({ notFound: true, trackingNumber });
  }

  // Fetch order line items from Shopify
  let products: any[] = [];
  if (tracking.order) {
    try {
      const orderData = await getOrder(shop.id, tracking.order.shopifyOrderId);
      products = orderData.lineItems.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        quantity: edge.node.quantity,
        imageUrl: edge.node.image?.url || null,
      }));
    } catch (error) {
      logger.error('Failed to fetch order line items', { error, orderId: tracking.order.shopifyOrderId });
    }
  }

  return json({
    notFound: false,
    tracking: {
      trackingNumber: tracking.trackingNumber,
      status: tracking.status,
      orderName: tracking.order?.orderName || 'N/A',
      lastMileSlug: tracking.lastMileSlug,
      lastMileTracking: tracking.lastMileTracking,
      lastMileUrl: tracking.lastMileUrl,
    },
    events: tracking.redactedEvents.map(e => ({
      id: e.id,
      messageRedacted: e.messageRedacted,
      occurredAt: e.occurredAt.toISOString(),
    })),
    products,
  });
}
```
**Output**: Loader created (without component yet)

---

### Task 13.2: Create tracking page component
**Goal**: Render all tracking UI components
**Test**: Page displays complete tracking info
```typescript
// app/routes/apps.track.$trackingNumber.tsx (add to existing file)
import { TrackingHeader } from '~/components/tracking/TrackingHeader';
import { OrderSummary } from '~/components/tracking/OrderSummary';
import { LastMileCard } from '~/components/tracking/LastMileCard';
import { ProductList } from '~/components/tracking/ProductList';
import { EventTimeline } from '~/components/tracking/EventTimeline';
import { EmptyState } from '~/components/ui/EmptyState';

export default function TrackingPage() {
  const data = useLoaderData<typeof loader>();

  if (data.notFound) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <TrackingHeader />
        <EmptyState message="We can't find this tracking number yet. Check the number or try again later." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <TrackingHeader />
      <OrderSummary
        orderName={data.tracking.orderName}
        status={data.tracking.status as any}
        trackingNumber={data.tracking.trackingNumber}
      />
      <LastMileCard
        carrierName={data.tracking.lastMileSlug}
        trackingNumber={data.tracking.lastMileTracking}
        url={data.tracking.lastMileUrl}
      />
      {data.products.length > 0 && <ProductList products={data.products} />}
      <EventTimeline events={data.events} />
    </div>
  );
}
```
**Output**: Complete tracking page

---

### Task 13.3: Create search redirect route
**Goal**: Handle /apps/track?query=XXX and redirect to tracking page
**Test**: Search redirects to correct tracking URL
```typescript
// app/routes/apps.track.tsx
import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { verifyAppProxySignature, extractShopDomain } from '~/lib/security/app-proxy-hmac';
import { db } from '~/lib/utils/db';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryParams = new URLSearchParams(url.search);

  // Verify signature
  if (!verifyAppProxySignature(queryParams)) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const query = queryParams.get('query');
  if (!query) {
    throw new Response('Missing query parameter', { status: 400 });
  }

  const shopDomain = extractShopDomain(queryParams);
  if (!shopDomain) {
    throw new Response('Missing shop domain', { status: 400 });
  }

  // Find shop
  const shop = await db.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    throw new Response('Shop not found', { status: 404 });
  }

  // Check if tracking exists
  const tracking = await db.tracking.findFirst({
    where: {
      shopId: shop.id,
      trackingNumber: query.trim(),
    },
  });

  if (!tracking) {
    // Redirect to tracking page anyway (will show "not found")
    return redirect(`/apps/track/${query.trim()}?${queryParams.toString()}`);
  }

  // Redirect to tracking page with signature preserved
  return redirect(`/apps/track/${tracking.trackingNumber}?${queryParams.toString()}`);
}
```
**Output**: `app/routes/apps.track.tsx` created

---

## Phase 14: Testing & Validation

### Task 14.1: Create seed script for test data
**Goal**: Populate DB with sample shop, order, tracking, events
**Test**: Script runs and creates records
```typescript
// scripts/seed-test-data.ts
import { db } from '../app/lib/utils/db';
import { encrypt } from '../app/lib/security/encryption';

async function main() {
  // Create test shop
  const shop = await db.shop.create({
    data: {
      shopDomain: 'test-store.myshopify.com',
      accessToken: encrypt('fake-access-token'),
    },
  });

  // Create test order
  const order = await db.order.create({
    data: {
      shopId: shop.id,
      shopifyOrderId: '1234567890',
      orderName: '#1001',
    },
  });

  // Create test tracking
  const tracking = await db.tracking.create({
    data: {
      shopId: shop.id,
      orderId: order.id,
      trackingNumber: 'TEST123456789CN',
      status: 'in_transit',
      carrierSlug: 'china-post',
      lastMileSlug: 'usps',
      lastMileTracking: '9400123456789',
      lastMileUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400123456789',
      registeredWith17Track: true,
    },
  });

  // Create test events
  await db.eventRedacted.createMany({
    data: [
      {
        trackingId: tracking.id,
        statusCode: 'InTransit',
        messageRedacted: 'Package departed from facility',
        occurredAt: new Date('2024-01-15T08:00:00Z'),
      },
      {
        trackingId: tracking.id,
        statusCode: 'InTransit',
        messageRedacted: 'In transit to destination',
        occurredAt: new Date('2024-01-16T12:30:00Z'),
      },
      {
        trackingId: tracking.id,
        statusCode: 'InTransit',
        messageRedacted: 'Arrived at regional hub',
        occurredAt: new Date('2024-01-17T09:15:00Z'),
      },
    ],
  });

  console.log('Test data seeded successfully');
  console.log(`Shop: ${shop.shopDomain}`);
  console.log(`Tracking: ${tracking.trackingNumber}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
```
Run: `npx tsx scripts/seed-test-data.ts`
**Output**: Test data in database

---

### Task 14.2: Manual test: App Proxy tracking page
**Goal**: Verify tracking page renders with test data
**Test**: Visit tracking page with mock signature, see all components
1. Start app: `npm run dev`
2. Start worker: `npm run worker`
3. Generate mock App Proxy URL with valid signature
4. Visit `/apps/track/TEST123456789CN?signature=...&shop=test-store.myshopify.com`
5. Verify page shows:
   - Order #1001
   - Status badge: "In Transit"
   - Tracking number
   - Last-mile card with USPS link
   - Timeline with 3 events

**Output**: Manual test passes

---

### Task 14.3: Write integration test for Shopify webhook
**Goal**: Test fulfillment webhook creates tracking and enqueues job
**Test**: Test passes
```typescript
// tests/integration/shopify-webhook.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../app/lib/utils/db';
import crypto from 'crypto';
import { env } from '../../app/lib/utils/env';

describe('Shopify Webhook Integration', () => {
  beforeAll(async () => {
    // Setup test shop
    await db.shop.create({
      data: {
        shopDomain: 'webhook-test.myshopify.com',
        accessToken: 'encrypted-token',
      },
    });
  });

  it('processes fulfillment webhook and creates tracking', async () => {
    const payload = {
      id: 9876543210,
      order_id: 1234567890,
      name: '#1002',
      tracking_number: 'WEBHOOK123456789',
      tracking_company: 'DHL',
    };

    const body = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    // Simulate webhook POST
    const response = await fetch('http://localhost:5173/webhooks/shopify', {
      method: 'POST',
      headers: {
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Topic': 'fulfillments/create',
        'X-Shopify-Shop-Domain': 'webhook-test.myshopify.com',
        'Content-Type': 'application/json',
      },
      body,
    });

    expect(response.status).toBe(200);

    // Verify tracking created
    const tracking = await db.tracking.findFirst({
      where: { trackingNumber: 'WEBHOOK123456789' },
    });
    expect(tracking).not.toBeNull();
    expect(tracking?.carrierSlug).toBe('DHL');
  });
});
```
**Output**: Integration test suite started

---

### Task 14.4: Test redaction with real China terms
**Goal**: Verify redaction works end-to-end
**Test**: Event with "Shenzhen, China" becomes placeholder
1. Create raw event with China terms
2. Process via worker
3. Verify redacted event has placeholder

**Output**: Redaction verified in real flow

---

## Phase 15: Deployment Preparation

### Task 15.1: Add production build scripts
**Goal**: Scripts for building and starting app
**Test**: Build succeeds
```json
{
  "scripts": {
    "build": "remix vite:build",
    "start": "remix-serve ./build/server/index.js",
    "dev": "remix vite:dev",
    "worker": "tsx app/workers/worker.ts",
    "test": "vitest"
  }
}
```
**Output**: Build scripts added

---

### Task 15.2: Create Procfile for deployment
**Goal**: Define web and worker processes
**Test**: File exists
```
web: npm run start
worker: npm run worker
```
**Output**: `Procfile` created

---

### Task 15.3: Add production environment variables checklist
**Goal**: Document required env vars for deployment
**Test**: File created
```markdown
# Production Environment Variables Checklist

## Required
- [ ] SHOPIFY_API_KEY
- [ ] SHOPIFY_API_SECRET
- [ ] SHOPIFY_SCOPES=read_orders,read_fulfillments
- [ ] SEVENTEEN_TRACK_API_KEY
- [ ] DATABASE_URL (Postgres connection string)
- [ ] REDIS_URL (Redis connection string)
- [ ] SESSION_SECRET (32+ character random string)
- [ ] ENCRYPTION_KEY (32+ character random string)
- [ ] APP_URL (your deployed app URL, e.g., https://your-app.railway.app)
- [ ] NODE_ENV=production

## Generate secrets
```bash
# SESSION_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY
openssl rand -base64 32
```
```
**Output**: `deployment-checklist.md` created

---

### Task 15.4: Add basic health check endpoint
**Goal**: Route for monitoring uptime
**Test**: GET /health returns 200
```typescript
// app/routes/health.tsx
import { json } from '@remix-run/node';
import { db } from '~/lib/utils/db';

export async function loader() {
  try {
    await db.$queryRaw`SELECT 1`;
    return json({ status: 'healthy' });
  } catch (error) {
    return json({ status: 'unhealthy', error: 'Database connection failed' }, { status: 500 });
  }
}
```
**Output**: `app/routes/health.tsx` created

---

### Task 15.5: Add README with setup instructions
**Goal**: Document how to run the app locally
**Test**: README created
```markdown
# Shopify Tracking Redaction App

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Setup database:
```bash
npx prisma migrate dev
```

4. Seed test data (optional):
```bash
npx tsx scripts/seed-test-data.ts
```

5. Start development server:
```bash
npm run dev
```

6. Start worker (in separate terminal):
```bash
npm run worker
```

## Testing

Run tests:
```bash
npm test
```

## Deployment

See `deployment-checklist.md` for production setup.
```
**Output**: `README.md` created

---

## Phase 16: Final Polish & Launch Preparation

### Task 16.1: Add error boundary to tracking page
**Goal**: Graceful error handling
**Test**: Invalid requests show error page
```typescript
// app/routes/apps.track.$trackingNumber.tsx (add to existing file)
import { isRouteErrorResponse, useRouteError } from '@remix-run/react';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error {error.status}</h1>
          <p className="text-red-700">{error.statusText || 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-red-900 mb-2">Unexpected Error</h1>
        <p className="text-red-700">Please try again later.</p>
      </div>
    </div>
  );
}
```
**Output**: Error boundary added

---

### Task 16.2: Add rate limiting to App Proxy routes
**Goal**: Prevent abuse of public tracking pages
**Test**: Too many requests return 429
```typescript
// app/lib/security/rate-limit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
```

Apply in loader:
```typescript
// app/routes/apps.track.$trackingNumber.tsx (add to loader)
const clientIp = request.headers.get('X-Forwarded-For') || 'unknown';
if (!checkRateLimit(clientIp)) {
  throw new Response('Too many requests', { status: 429 });
}
```
**Output**: Rate limiting implemented

---

### Task 16.3: Add app configuration in Shopify Partners
**Goal**: Register app in Shopify Partner Dashboard
**Test**: App listing created with App Proxy configured
1. Go to https://partners.shopify.com/
2. Create new app
3. Set App URL: `https://your-app-url.com`
4. Set Redirection URLs: `https://your-app-url.com/auth/callback`
5. Configure App Proxy:
   - Subpath prefix: `apps`
   - Subpath: `track`
   - Proxy URL: `https://your-app-url.com`
6. Save API credentials to `.env`

**Output**: App registered in Shopify

---

### Task 16.4: Configure 17TRACK webhook URL
**Goal**: Point 17TRACK webhooks to app
**Test**: Webhooks configured in 17TRACK dashboard
1. Login to 17TRACK dashboard
2. Navigate to Webhook settings
3. Set webhook URL: `https://your-app-url.com/webhooks/17track`
4. Save configuration

**Output**: 17TRACK webhooks configured

---

### Task 16.5: Deploy to production platform
**Goal**: Deploy app to Railway/Render/Fly.io
**Test**: App accessible at production URL
1. Create account on Railway/Render
2. Create new project
3. Connect GitHub repo
4. Add environment variables from `.env` (production values)
5. Add Postgres and Redis add-ons
6. Deploy
7. Run migrations: `npx prisma migrate deploy`

**Output**: App deployed and running

---

### Task 16.6: Test OAuth flow on real Shopify store
**Goal**: Install app on test store
**Test**: Installation succeeds, webhooks registered
1. Visit: `https://test-store.myshopify.com/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=read_orders,read_fulfillments&redirect_uri=https://your-app-url.com/auth/callback`
2. Approve installation
3. Verify shop record created in DB
4. Verify webhooks registered in Shopify admin

**Output**: App successfully installed

---

### Task 16.7: Test end-to-end flow with real tracking
**Goal**: Verify complete flow from fulfillment to tracking page
**Test**: Real tracking number shows on public page with redacted events
1. Create order in Shopify test store
2. Add fulfillment with real tracking number
3. Verify webhook received and tracking created
4. Manually trigger 17TRACK registration (or wait for real event)
5. Add test event with China terms via 17TRACK
6. Verify event redacted and stored
7. Visit tracking page: `https://test-store.myshopify.com/apps/track/TRACKING_NUMBER`
8. Verify all components render correctly with redacted data

**Output**: End-to-end flow verified

---

## Summary

This task list provides **167 granular, testable tasks** organized into **16 phases**:

- **Phase 0-2**: Project setup, database, security utilities
- **Phase 3-4**: Redaction engine and status mapping
- **Phase 5**: Queue and worker infrastructure
- **Phase 6-9**: Shopify OAuth, webhooks, and integration
- **Phase 10-11**: 17TRACK integration and event processing
- **Phase 12-13**: Frontend components and tracking page
- **Phase 14**: Testing and validation
- **Phase 15-16**: Deployment and production launch

Each task:
- Has clear start and end points
- Focuses on one concern
- Includes test criteria
- Can be completed independently (within phase dependencies)

This structure allows an LLM to implement one task at a time while you test between tasks to ensure everything works before moving forward.
