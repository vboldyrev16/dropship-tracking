import { PrismaClient } from '@prisma/client';
import { encrypt } from '../app/lib/security/encryption.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test shop
  const shop = await prisma.shop.upsert({
    where: { shopDomain: 'test-store.myshopify.com' },
    update: {},
    create: {
      shopDomain: 'test-store.myshopify.com',
      accessToken: encrypt('fake-access-token-for-testing'),
    },
  });
  console.log(`Created shop: ${shop.shopDomain}`);

  // Create test order
  const order = await prisma.order.upsert({
    where: { shopId_shopifyOrderId: { shopId: shop.id, shopifyOrderId: 'gid://shopify/Order/5001' } },
    update: {},
    create: {
      shopId: shop.id,
      shopifyOrderId: 'gid://shopify/Order/5001',
      orderName: '#1001',
    },
  });
  console.log(`Created order: ${order.orderName}`);

  // Create test tracking
  const tracking = await prisma.tracking.upsert({
    where: { shopId_trackingNumber: { shopId: shop.id, trackingNumber: 'TEST123456789CN' } },
    update: {},
    create: {
      shopId: shop.id,
      orderId: order.id,
      trackingNumber: 'TEST123456789CN',
      status: 'in_transit',
      lastMileSlug: 'usps',
      lastMileTracking: '9400123456789000000001',
      lastMileUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400123456789000000001',
      registeredWith17Track: true,
    },
  });
  console.log(`Created tracking: ${tracking.trackingNumber}`);

  // Create raw events with proper fields
  await prisma.eventRaw.create({
    data: {
      trackingId: tracking.id,
      provider: '17track',
      payloadJson: JSON.stringify({
        status: 'InfoReceived',
        statusCode: 10,
        substatus: 'InfoReceived001',
        substatusCode: 1001,
        message: 'Shipment picked up in Shenzhen, China',
      }),
      occurredAt: new Date('2024-01-15T10:00:00Z'),
    },
  });

  await prisma.eventRaw.create({
    data: {
      trackingId: tracking.id,
      provider: '17track',
      payloadJson: JSON.stringify({
        status: 'InTransit',
        statusCode: 30,
        substatus: 'InTransit001',
        substatusCode: 3001,
        message: 'In transit to United States',
      }),
      occurredAt: new Date('2024-01-17T08:00:00Z'),
    },
  });

  await prisma.eventRaw.create({
    data: {
      trackingId: tracking.id,
      provider: '17track',
      payloadJson: JSON.stringify({
        status: 'InTransit',
        statusCode: 30,
        substatus: 'InTransit002',
        substatusCode: 3002,
        message: 'Arrived at US distribution center',
      }),
      occurredAt: new Date('2024-01-20T15:30:00Z'),
    },
  });

  await prisma.eventRaw.create({
    data: {
      trackingId: tracking.id,
      provider: '17track',
      payloadJson: JSON.stringify({
        status: 'InTransit',
        statusCode: 30,
        substatus: 'InTransit003',
        substatusCode: 3003,
        message: 'Handed over to USPS for final delivery',
      }),
      occurredAt: new Date('2024-01-21T09:00:00Z'),
    },
  });
  console.log('Created raw events');

  // Create redacted events
  await prisma.eventRedacted.create({
    data: {
      trackingId: tracking.id,
      statusCode: '10',
      messageRedacted: 'Shipment picked up',
      occurredAt: new Date('2024-01-15T10:00:00Z'),
    },
  });

  await prisma.eventRedacted.create({
    data: {
      trackingId: tracking.id,
      statusCode: '30',
      messageRedacted: 'In transit to United States',
      occurredAt: new Date('2024-01-17T08:00:00Z'),
    },
  });

  await prisma.eventRedacted.create({
    data: {
      trackingId: tracking.id,
      statusCode: '30',
      messageRedacted: 'Arrived at US distribution center',
      occurredAt: new Date('2024-01-20T15:30:00Z'),
    },
  });

  await prisma.eventRedacted.create({
    data: {
      trackingId: tracking.id,
      statusCode: '30',
      messageRedacted: 'Handed over to USPS for final delivery',
      occurredAt: new Date('2024-01-21T09:00:00Z'),
    },
  });
  console.log('Created redacted events');

  // Create a second tracking without order (for not-found scenarios)
  const tracking2 = await prisma.tracking.upsert({
    where: { shopId_trackingNumber: { shopId: shop.id, trackingNumber: 'NOTFOUND123' } },
    update: {},
    create: {
      shopId: shop.id,
      trackingNumber: 'NOTFOUND123',
      status: 'ordered',
      registeredWith17Track: false,
    },
  });
  console.log(`Created tracking without events: ${tracking2.trackingNumber}`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
