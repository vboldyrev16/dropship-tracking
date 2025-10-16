# Shopify App Configuration Guide

Complete checklist for configuring your Shopify app before launch.

## Prerequisites

- Deployed app URL (e.g., https://yourapp.herokuapp.com)
- Shopify Partner account
- App created in Partners Dashboard

## Configuration Steps

### 1. App Setup

Go to [Shopify Partners Dashboard](https://partners.shopify.com/) > Apps > Your App

#### App Information
- **App name**: Choose a clear, descriptive name (e.g., "Private Label Tracking")
- **App URL**: `https://yourapp.herokuapp.com`
- **Allowed redirection URL(s)**: 
  - `https://yourapp.herokuapp.com/auth/callback`

#### App credentials
- Copy **Client ID** → Set as `SHOPIFY_API_KEY` in your environment variables
- Copy **Client secret** → Set as `SHOPIFY_API_SECRET` in your environment variables

### 2. API Access

#### API scopes
Select the following scopes:
- ✅ `read_orders` - Read order information
- ✅ `write_orders` - Update orders (for tracking info)
- ✅ `read_fulfillments` - Read fulfillment data
- ✅ `write_fulfillments` - Update fulfillments

Set in environment: `SHOPIFY_SCOPES="read_orders,write_orders,read_fulfillments,write_fulfillments"`

#### Webhooks
Webhooks will be automatically registered during app installation. Manual configuration not required.

Expected webhooks:
- `fulfillments/create` → `https://yourapp.herokuapp.com/webhooks/shopify`
- `fulfillments/update` → `https://yourapp.herokuapp.com/webhooks/shopify`
- `customers/data_request` → `https://yourapp.herokuapp.com/webhooks/shopify`
- `customers/redact` → `https://yourapp.herokuapp.com/webhooks/shopify`
- `shop/redact` → `https://yourapp.herokuapp.com/webhooks/shopify`

### 3. App Proxy

Enable App Proxy to host the customer-facing tracking page on the merchant's domain.

#### Settings
- **Subpath prefix**: `apps`
- **Subpath**: `track`
- **Proxy URL**: `https://yourapp.herokuapp.com/apps`

This makes the tracking page accessible at:
```
https://merchant-store.myshopify.com/apps/track/<tracking-number>
```

### 4. App Listing (Optional - for Public Apps)

If making your app public on the Shopify App Store:

#### Overview
- **App title**: Clear, benefit-focused (e.g., "White Label Shipment Tracking")
- **Subtitle**: One-line value proposition
- **App icon**: 1200x1200px PNG with transparent background
- **App description**: 
  - What problem it solves
  - Key features
  - How it works
  - Benefits for merchants

Example description:
```
Hide China shipping origins from your customers automatically.

Perfect for dropshippers, this app provides a branded tracking experience 
while automatically removing references to China, Chinese cities, and 
manufacturing locations from shipping updates.

Key Features:
• Automatic location redaction from tracking events
• Real-time updates from 17TRACK
• Last-mile carrier handoff display (USPS, UPS, etc.)
• Hosted on your own domain
• GDPR compliant

How it works:
1. Install the app
2. Fulfill orders as normal with tracking numbers
3. Customers track orders on your domain
4. All China references automatically removed from updates

No configuration needed - works automatically with any tracking provider 
supported by 17TRACK.
```

#### Screenshots
Prepare 3-5 screenshots (1600x1200px or 1600x900px):
1. Tracking page with redacted events
2. Admin dashboard (if applicable)
3. Order fulfillment integration
4. Before/after redaction example
5. Mobile tracking view

#### Pricing
Define your pricing model:
- Free trial period (e.g., 7 days)
- Monthly subscription tiers
- Usage-based pricing

Example pricing:
```
Starter: $9.99/mo
- Up to 100 orders/month
- Automatic redaction
- Email support

Growth: $29.99/mo
- Up to 500 orders/month
- Everything in Starter
- Priority support

Pro: $79.99/mo
- Unlimited orders
- Everything in Growth
- Custom redaction rules
- Dedicated support
```

#### Support
- **Support email**: support@yourdomain.com
- **Support URL**: https://yourdomain.com/support
- **Privacy policy URL**: https://yourdomain.com/privacy (required)
- **Terms of service URL**: https://yourdomain.com/terms (optional)

### 5. GDPR Compliance

Ensure your app handles GDPR webhooks:

- ✅ `customers/data_request` - Respond with customer data within 30 days
- ✅ `customers/redact` - Delete customer data within 30 days
- ✅ `shop/redact` - Delete shop data after app uninstall

Current implementation:
- Webhooks are received and logged
- Shop/order/tracking data automatically cascade deletes (Prisma schema)
- For production, implement actual data export and deletion logic

### 6. Testing

Before submitting for review:

- [ ] Install app on a development store
- [ ] Complete OAuth flow successfully
- [ ] Create an order with tracking number
- [ ] Verify webhook received and processed
- [ ] Check tracking page displays correctly
- [ ] Verify redaction works on real tracking data
- [ ] Test on mobile devices
- [ ] Test GDPR webhook handlers
- [ ] Load test with multiple concurrent requests
- [ ] Verify app works after uninstall/reinstall

### 7. App Distribution

#### Private/Custom Apps
For use on specific stores only:
1. Share installation URL with merchants:
   ```
   https://yourapp.herokuapp.com/auth/shopify?shop=store-name.myshopify.com
   ```
2. Merchant approves installation
3. App begins tracking automatically

#### Public Apps
To list on Shopify App Store:
1. Complete all app listing requirements
2. Add privacy policy and terms of service
3. Submit for review in Partners Dashboard
4. Respond to any feedback from Shopify review team
5. Once approved, app appears in App Store

Review typically takes 1-2 weeks. Common rejection reasons:
- Missing privacy policy
- Unclear app description
- Poor quality screenshots
- App crashes or errors during testing
- Missing GDPR compliance

## Post-Launch

### Monitoring
- Set up error tracking (e.g., Sentry)
- Monitor webhook delivery rates
- Track app installation/uninstall rates
- Monitor API usage and rate limits

### Support
- Respond to merchant questions within 24 hours
- Monitor app reviews and feedback
- Document common issues in FAQ
- Provide clear uninstall instructions

### Updates
- Test updates on development store first
- Communicate changes to merchants
- Maintain changelog
- Follow semantic versioning

## Checklist

Configuration:
- [ ] App URL and redirect URL configured
- [ ] Client ID and secret saved in environment
- [ ] API scopes selected and configured
- [ ] App Proxy configured with correct URLs
- [ ] 17TRACK webhook URL configured
- [ ] Health check endpoint accessible

Testing:
- [ ] OAuth flow works end-to-end
- [ ] Webhooks received and processed
- [ ] Tracking page displays correctly
- [ ] Redaction removes China references
- [ ] Works on mobile devices
- [ ] GDPR webhooks handled

Production:
- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Worker dyno/process running
- [ ] Redis connected and accessible
- [ ] Health check returns 200 OK
- [ ] Logs aggregated and monitored
- [ ] Error tracking enabled
- [ ] Backups configured

Documentation:
- [ ] README updated with deployment steps
- [ ] Privacy policy published (if public)
- [ ] Support documentation created
- [ ] Changelog initialized

Launch:
- [ ] Tested on real Shopify store
- [ ] Billing configured (if applicable)
- [ ] Support email monitored
- [ ] Merchant onboarding flow tested
- [ ] App submitted for review (if public)

## Resources

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [App Store Listing Requirements](https://shopify.dev/docs/apps/store/requirements)
- [GDPR Compliance](https://shopify.dev/docs/apps/store/data-protection/gdpr)
- [App Review Process](https://shopify.dev/docs/apps/store/review)
- [Webhooks Documentation](https://shopify.dev/docs/api/admin-rest/latest/resources/webhook)
