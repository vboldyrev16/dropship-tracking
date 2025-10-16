import { type ActionFunctionArgs, json } from '@remix-run/node';
import { verifyShopifyWebhook } from '~/lib/security/webhook-hmac';
import { handleFulfillmentCreate } from '~/lib/shopify/webhook-handlers';
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
