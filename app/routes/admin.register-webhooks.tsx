import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { db } from '~/lib/utils/db';
import { registerWebhooks } from '~/lib/shopify/webhooks';
import { logger } from '~/lib/utils/logger';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop') || 'test-dropship-tracking.myshopify.com';

  try {
    logger.info('Finding shop for webhook registration', { shop });
    
    const shopRecord = await db.shop.findUnique({
      where: { shopDomain: shop }
    });

    if (!shopRecord) {
      return json({ error: 'Shop not found' }, { status: 404 });
    }

    logger.info('Registering webhooks', { shopId: shopRecord.id, shop });
    await registerWebhooks(shopRecord.id);

    return json({ 
      success: true, 
      message: 'Webhooks registered successfully',
      shopId: shopRecord.id,
      shop: shopRecord.shopDomain
    });
  } catch (error) {
    logger.error('Webhook registration failed', { error, shop });
    return json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
