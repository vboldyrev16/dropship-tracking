1) Overview

Goal. Give shoppers a clean tracking page (hosted on the merchant’s domain) with real-time updates while redacting China-related text from scan events.
Primary users.
	•	Shopper (end customer) — views tracking status.
	•	Merchant (PA user) — installs the app; no settings required in v1 beyond installation.
Hosting pattern. Storefront page via Shopify App Proxy (e.g., https://{shop}/apps/track/:trackingNumber) that securely forwards to our backend.  ￼

2) Problem & Success Criteria

Problem. Shoppers see “China” (CN, city names) in tracking events → negative perception/reviews → merchants churn.
Success (MVP):
	•	A shopper can open a shareable tracking URL and see canonical status, last-mile info, products, and an events timeline with redacted China terms.
	•	Data is near real-time via 17TRACK webhooks (with polling fallback).  ￼

3) Scope (MVP)

3.1 Functional requirements

Public tracking page (GET /apps/track/:trackingNumber via App Proxy)
	•	Header: search input (tracking number).
	•	Summary: Order number (Shopify order.name), Current status (canonical), Tracking number.
	•	Last-mile: Carrier name, last-mile tracking number, and external link to last-mile page (when available). Prefer provider’s last-mile URL; fall back to Shopify’s FulfillmentTrackingInfo.url when carrier is recognized by Shopify.  ￼
	•	Products: image, title, quantity (from Shopify order line items).
	•	Timeline: list of events (date, time, message) with redaction applied.
	•	Direct links work even if the shopper navigates without prior app context.
	•	Search: GET /apps/track?query=<trackingNumber> → redirect to per-tracking page.

Data ingestion
	•	Shopify webhooks: subscribe to fulfillments/create and fulfillments/update to capture tracking numbers as soon as they’re added; optionally fulfillment_events/create if you want native events too.  ￼
	•	17TRACK: register tracking numbers; receive webhook pushes for status/scan updates.  ￼

Redaction
	•	Apply to event text, city, and country before rendering.
	•	Default denylist (v1, global): \b(CN|China|PRC)\b and common city hubs (e.g., Shenzhen, Guangzhou, Yiwu, Foshan, Zhengzhou).
	•	If a message becomes empty after redaction, show neutral placeholder (e.g., “Processing at origin facility”).

Status mapping (provider → canonical)
	•	Ordered: order created (no fulfillment yet) or 17TRACK “info received” equivalence.
	•	Order ready: label/fulfillment created; first scan received.
	•	In transit: general transit scans, airline departures/arrivals, hub movements.
	•	Out for delivery: explicit OOD event.
	•	Delivered: delivered event.
(Refine exact 17TRACK status/category mapping during integration; 17TRACK provides categories + webhook payloads to derive these states.)  ￼

Shareable URLs
	•	Per tracking number: /apps/track/:trackingNumber.
	•	Optional order alias for future versions (not required in MVP).

3.2 Non-functional requirements
	•	Performance: First contentful paint < 2.0s p95 on 4G; API TTFB < 500ms when hot.
	•	Availability: 99.9% monthly.
	•	Security: Verify App Proxy HMAC on every storefront request; verify Shopify & 17TRACK webhooks; OAuth app scopes minimal.  ￼
	•	Privacy & compliance: Subscribe to Shopify’s mandatory GDPR/LFDA webhooks (customers/data_request, customers/redact, shop/redact).  ￼

4) Dependencies & Access
	•	Shopify Admin API (GraphQL preferred) for orders/fulfillments (read_orders, read_fulfillments); use FulfillmentTrackingInfo when present.  ￼
	•	17TRACK API (https://api.17track.net/track/v1) with webhook configured to our endpoint (API key + signing).  ￼

5) High-level Architecture
	•	Frontend:
	•	Embedded admin (later) not required for MVP; public tracking page rendered via App Proxy fetch → backend page renderer (SSR).
	•	Backend:
	•	Node/TS (Remix/Next server).
	•	Postgres (Prisma).
	•	Worker/queue for webhook processing + polling retries.
	•	Integrations:
	•	Shopify OAuth + webhooks (fulfillments).  ￼
	•	17TRACK track-create, webhook receiver.  ￼

6) Data Model (MVP)
	•	shops: {id, shop_domain, access_token, installed_at}
	•	orders: {id, shop_id, shopify_order_id, order_name}
	•	trackings: {id, shop_id, tracking_number, carrier_slug NULL, status_enum, last_mile_slug NULL, last_mile_tracking NULL, order_id}
	•	events_raw: {id, tracking_id, provider ('shopify'|'17track'), payload_json, occurred_at}
	•	events_redacted: {id, tracking_id, status_code, message_redacted, city_redacted, country_redacted, occurred_at}

7) API & Flows

7.1 Shopify → App
	1.	Merchant adds tracking to a fulfillment.
	2.	Webhook fulfillments/create|update hits our backend → upsert order & tracking, then register with 17TRACK.  ￼
	3.	(Optional) consume fulfillment_events/create for extra signals.
	4.	We periodically poll for lagging carriers (e.g., every 6–12h) as a fallback.

7.2 17TRACK → App
	•	Step 1: Configure webhook URL in 17TRACK console.
	•	Step 2: Register tracking numbers via API.
	•	Step 3: Receive webhooks with scans/status → store in events_raw, derive canonical status, persist to events_redacted after redaction.  ￼

7.3 Storefront (App Proxy)
	•	GET /apps/track/:trackingNumber → backend verifies HMAC, loads tracking + events, renders page.
	•	GET /apps/track?query= → redirect to per-tracking URL if found.  ￼

8) UX & Content (MVP)

Page sections:
	1.	Search bar (tracking number).
	2.	Order summary: Order #, current status pill, tracking number.
	3.	Last-mile: “Delivered by {Carrier}” + clickable last-mile tracking number link (if available).
	4.	Items: image • title • qty.
	5.	Timeline: date • time • redacted message (newest first).
Empty/error states:

	•	Unknown tracking → “We can’t find this tracking number yet. Check the number or try again later.”
	•	No last-mile yet → show placeholder and hide link.
	•	Delivered → show delivered banner and collapse older events.
Time format: ISO date + localize to store’s timezone if available; else UTC offset display.

9) Status Canonicalization (details)
	•	Determine canonical status by evaluating latest provider category + flags.
	•	Once Delivered, lock status unless provider sends reversal.
	•	Show Out for delivery only when explicit OOD signal exists.

10) Redaction Spec
	•	Apply before render; never mutate stored events_raw.
	•	Text pipeline: normalize → apply denylist regexes (global, case-insensitive) → collapse whitespace/punctuation → if content empty, use placeholder.
	•	Keep timestamps unchanged.
	•	Do not redact carrier names or last-mile links.

11) Security & Compliance
	•	Verify App Proxy HMAC on each storefront request; reject invalid signatures.  ￼
	•	Verify Shopify webhook HMAC; idempotent processing.
	•	Verify 17TRACK webhook signature (if provided) and whitelist IPs if available.  ￼
	•	Implement Shopify mandatory privacy webhooks and data deletion flows.  ￼

12) Metrics & Observability
	•	Coverage: % trackings with last-mile identified.
	•	Latency: median time from Shopify fulfillment to first 17TRACK event.
	•	Engagement: CTR to last-mile link; page views.
	•	Quality: % events redacted; complaint rate.
	•	Reliability: webhook error rate; processing lag; 5xx rate.

13) Acceptance Criteria (Gherkin-style)
	•	View tracking page
	•	Given a tracking registered with events
	•	When shopper visits /apps/track/AB123456789CN
	•	Then they see Order #, Current status, Tracking #, Items, Timeline, and (if available) the last-mile carrier + link.
	•	Redaction
	•	Given an event message “Departed Shenzhen, China”
	•	When it renders
	•	Then “Shenzhen” and “China” are hidden or replaced; timestamp remains visible.
	•	Search
	•	Given the search UI
	•	When shopper enters a known tracking number
	•	Then they are redirected to /apps/track/:trackingNumber.
	•	Real-time
	•	Given 17TRACK posts a new event
	•	When our webhook processes it
	•	Then the event appears on the page on refresh within seconds (queue end-to-end p95 < 10s).  ￼
	•	Security
	•	Given an App Proxy call with invalid HMAC
	•	Then respond 401/403 without rendering.  ￼

14) Out of Scope (MVP)
	•	Branding/customization, localization, ETA predictions, email/SMS notifications, theme app blocks, admin analytics UI, multi-provider switching, order-number tracking URLs.

15) Rollout Plan
	1.	Dev: private app; one test store; dummy webhook receiver.
	2.	Sandbox: connect 17TRACK test keys; process synthetic events.
	3.	Beta (1–3 merchants): monitor lag, % last-mile populated, redaction accuracy.
	4.	Public: publish with privacy policy + minimal docs on adding “Track my order” link.

16) Open Questions
	•	Do we also show estimated delivery date when 17TRACK provides it? (v1 skip; track field availability.)
	•	Should we expose a manual refresh button if merchants want instant re-pulls?
	•	Any jurisdictions the merchants sell into that require explicit disclosure of shipment origin?