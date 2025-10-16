# Testing Guide

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. (Optional) Start the worker for background jobs:
   ```bash
   npm run worker
   ```

3. Ensure Redis is running (see REDIS_SETUP.md)

## Task 14.2: Test OAuth Flow Manually

### Step 1: Initiate OAuth
Visit the OAuth URL in your browser:
```
http://localhost:5173/auth/shopify?shop=YOUR_SHOP.myshopify.com
```

Replace `YOUR_SHOP` with your actual Shopify store subdomain.

### Step 2: Grant Permissions
- You'll be redirected to Shopify's permission page
- Review the requested scopes (read_orders, write_orders, etc.)
- Click "Install app" to grant permissions

### Step 3: Verify Callback
- After granting permissions, you'll be redirected back to:
  ```
  http://localhost:5173/auth/callback
  ```
- Check for success message
- Verify webhooks were registered

### Step 4: Verify Database
Check that shop was created with encrypted access token:
```bash
npx prisma studio
```

Navigate to the Shop table and verify your shop appears.

## Task 14.3: Test Tracking Page with Sample Data

### Option A: Use Seeded Data

The seed script creates test data with:
- Shop: test-store.myshopify.com
- Tracking: TEST123456789CN
- Order: #1001
- 4 redacted events

### Step 1: Build App Proxy Query String

To test locally, you need to manually construct the App Proxy query parameters with HMAC signature.

**Required Parameters:**
- `logged_in_customer_id` - Customer ID (or empty)
- `path_prefix` - "/apps/track"
- `shop` - "test-store.myshopify.com"
- `timestamp` - Unix timestamp

**Calculate HMAC:**
```javascript
const crypto = require('crypto');
const params = [
  'logged_in_customer_id=',
  'path_prefix=/apps/track',
  'shop=test-store.myshopify.com',
  'timestamp=1234567890'
].join(''); // NO & between params

const signature = crypto
  .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
  .update(params, 'utf8')
  .digest('hex');
```

### Step 2: Visit Tracking Page

Navigate to:
```
http://localhost:5173/apps/track/TEST123456789CN?logged_in_customer_id=&path_prefix=/apps/track&shop=test-store.myshopify.com&timestamp=1234567890&signature=<calculated_signature>
```

**Expected Result:**
- Order summary with "#1001" and "In Transit" status
- Last mile carrier: USPS with tracking link
- Product list (will be empty unless order exists in Shopify)
- Event timeline with 4 events showing redacted messages

### Step 3: Test Not Found

Visit with invalid tracking number:
```
http://localhost:5173/apps/track/INVALID123?<same_query_params>
```

**Expected Result:**
- Empty state message: "We can't find this tracking number yet..."

### Option B: Test with Real Fulfillment

1. Create an order in your Shopify store
2. Add a fulfillment with a tracking number
3. Wait for webhook to be received at `/webhooks/shopify`
4. Check database for new tracking record
5. Visit tracking page with real tracking number

## Task 14.4: Integration Test for Redaction Pipeline

Run the integration test:
```bash
npm test -- tests/integration/redaction-pipeline.test.ts
```

This tests the full flow:
1. Raw event creation
2. Event processing job
3. Redaction engine application
4. Redacted event creation
5. Status update

## Manual Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Shop record created with encrypted token
- [ ] Webhooks registered (check Shopify admin)
- [ ] Tracking page displays seeded data
- [ ] Tracking page shows not found for invalid numbers
- [ ] Events show redacted messages (no "China", "Shenzhen", etc.)
- [ ] Status badge renders correctly
- [ ] Last-mile card shows carrier info
- [ ] Error boundary handles invalid requests

## Troubleshooting

### HMAC Verification Fails
- Ensure SHOPIFY_API_SECRET in .env matches your app's API secret
- Verify parameter concatenation (no & between params)
- Check timestamp is not too old (Shopify rejects old timestamps)

### 404 on Tracking Page
- Verify route file exists: app/routes/apps.track.$trackingNumber.tsx
- Check dev server logs for errors
- Ensure shop exists in database

### No Events Displayed
- Run seed script: `npm run seed`
- Check database with: `npx prisma studio`
- Verify EventRedacted records exist for the tracking

### GraphQL Errors (Product List)
- This is expected with test data (order doesn't exist in Shopify)
- For real testing, use actual orders from your store
