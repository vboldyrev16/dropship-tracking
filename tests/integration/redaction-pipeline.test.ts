import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../../app/lib/security/encryption.js';
import { applyRedaction } from '../../app/lib/redaction/engine.js';
import { determineCanonicalStatus } from '../../app/lib/status/mapper.js';

const prisma = new PrismaClient();

describe('Redaction Pipeline Integration', () => {
  let shopId: string;
  let trackingId: string;
  let rawEventId: string;

  beforeAll(async () => {
    // Create test shop
    const shop = await prisma.shop.create({
      data: {
        shopDomain: 'integration-test.myshopify.com',
        accessToken: encrypt('test-token'),
      },
    });
    shopId = shop.id;

    // Create test order
    const order = await prisma.order.create({
      data: {
        shopId: shop.id,
        shopifyOrderId: 'gid://shopify/Order/999',
        orderName: '#999',
      },
    });

    // Create test tracking
    const tracking = await prisma.tracking.create({
      data: {
        shopId: shop.id,
        orderId: order.id,
        trackingNumber: 'INTEGRATION_TEST_123',
        status: 'ordered',
        registeredWith17Track: true,
      },
    });
    trackingId = tracking.id;

    // Create raw event with China references
    const rawEvent = await prisma.eventRaw.create({
      data: {
        trackingId: tracking.id,
        provider: '17track',
        payloadJson: JSON.stringify({
          status: 'InTransit',
          statusCode: 30,
          substatus: 'InTransit001',
          substatusCode: 3001,
          message: 'Package departed from Shenzhen, China facility',
        }),
        occurredAt: new Date('2024-01-15T10:00:00Z'),
      },
    });
    rawEventId = rawEvent.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.eventRedacted.deleteMany({ where: { trackingId } });
    await prisma.eventRaw.deleteMany({ where: { trackingId } });
    await prisma.tracking.delete({ where: { id: trackingId } });
    await prisma.order.deleteMany({ where: { shopId } });
    await prisma.shop.delete({ where: { id: shopId } });
    await prisma.$disconnect();
  });

  it('should process raw event and create redacted event', async () => {
    // Fetch raw event
    const rawEvent = await prisma.eventRaw.findUnique({
      where: { id: rawEventId },
    });

    expect(rawEvent).not.toBeNull();

    // Parse payload
    const payload = JSON.parse(rawEvent!.payloadJson);
    const originalMessage = payload.message;

    // Apply redaction
    const redactedMessage = applyRedaction(originalMessage);

    // Verify redaction worked
    expect(redactedMessage).not.toContain('China');
    expect(redactedMessage).not.toContain('Shenzhen');
    expect(redactedMessage).toContain('Package departed from');

    // Create redacted event (using 17TRACK status string, not code)
    await prisma.eventRedacted.create({
      data: {
        trackingId,
        statusCode: payload.status, // Use status string, not statusCode number
        messageRedacted: redactedMessage,
        occurredAt: rawEvent!.occurredAt,
      },
    });

    // Verify redacted event was created
    const redactedEvents = await prisma.eventRedacted.findMany({
      where: { trackingId },
    });

    expect(redactedEvents).toHaveLength(1);
    expect(redactedEvents[0].messageRedacted).toBe(redactedMessage);
  });

  it('should update tracking status based on events', async () => {
    // Fetch all redacted events
    const events = await prisma.eventRedacted.findMany({
      where: { trackingId },
      orderBy: { occurredAt: 'desc' },
    });

    // Map events to format expected by determineCanonicalStatus
    const mappedEvents = events.map(e => ({
      statusCode: e.statusCode || '',
      occurredAt: e.occurredAt,
    }));

    // Determine status
    const newStatus = determineCanonicalStatus(mappedEvents as any[]);

    // Update tracking
    await prisma.tracking.update({
      where: { id: trackingId },
      data: { status: newStatus },
    });

    // Verify tracking status was updated
    const tracking = await prisma.tracking.findUnique({
      where: { id: trackingId },
    });

    expect(tracking).not.toBeNull();
    expect(tracking!.status).toBe('in_transit');
  });

  it('should handle multiple events and determine correct status', async () => {
    // Add a delivered event
    const deliveredEvent = await prisma.eventRaw.create({
      data: {
        trackingId,
        provider: '17track',
        payloadJson: JSON.stringify({
          status: 'Delivered',
          statusCode: 40,
          substatus: 'Delivered001',
          substatusCode: 4001,
          message: 'Package delivered to recipient in Beijing, PRC',
        }),
        occurredAt: new Date('2024-01-20T14:00:00Z'),
      },
    });

    // Process the delivered event
    const rawEvent = await prisma.eventRaw.findUnique({
      where: { id: deliveredEvent.id },
    });

    const payload = JSON.parse(rawEvent!.payloadJson);
    const redactedMessage = applyRedaction(payload.message);

    // Verify redaction
    expect(redactedMessage).not.toContain('Beijing');
    expect(redactedMessage).not.toContain('PRC');

    // Create redacted event (using 17TRACK status string)
    await prisma.eventRedacted.create({
      data: {
        trackingId,
        statusCode: payload.status, // Use status string: "Delivered"
        messageRedacted: redactedMessage,
        occurredAt: rawEvent!.occurredAt,
      },
    });

    // Get all events and determine status
    const events = await prisma.eventRedacted.findMany({
      where: { trackingId },
      orderBy: { occurredAt: 'desc' },
    });

    const mappedEvents = events.map(e => ({
      statusCode: e.statusCode || '',
      occurredAt: e.occurredAt,
    }));

    const newStatus = determineCanonicalStatus(mappedEvents as any[]);

    // Update tracking
    await prisma.tracking.update({
      where: { id: trackingId },
      data: { status: newStatus },
    });

    // Verify status is now delivered
    const tracking = await prisma.tracking.findUnique({
      where: { id: trackingId },
    });

    expect(tracking!.status).toBe('delivered');

    // Verify latest redacted event doesn't contain China references
    const latestRedacted = events[0];
    expect(latestRedacted.messageRedacted).toBe(redactedMessage);
    expect(latestRedacted.messageRedacted).not.toContain('Beijing');
    expect(latestRedacted.messageRedacted).not.toContain('PRC');
  });
});
