import { env } from '../utils/env';
import { decrypt } from '../security/encryption';
import { db } from '../utils/db';
import { logger } from '../utils/logger';

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
    try {
      const response = await fetch(`https://${shop.shopDomain}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ webhook }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to register webhook', {
          topic: webhook.topic,
          status: response.status,
          error: errorText,
        });
      } else {
        logger.info('Webhook registered', { topic: webhook.topic, shop: shop.shopDomain });
      }
    } catch (error) {
      logger.error('Webhook registration error', { topic: webhook.topic, error });
    }
  }
}
