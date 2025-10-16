import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { inngest } from '../../inngest/client';

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

  // Send event to Inngest to register with 17TRACK
  await inngest.send({
    name: 'tracking/register',
    data: {
      trackingId: tracking.id,
      trackingNumber: tracking.trackingNumber,
      shopId: shop.id,
    },
  });
  logger.info('Tracking created and event sent', { trackingId: tracking.id });
}
