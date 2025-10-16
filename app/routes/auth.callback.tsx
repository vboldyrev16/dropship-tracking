import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { exchangeCodeForToken, storeShopCredentials } from '~/lib/shopify/auth';
import { registerWebhooks } from '~/lib/shopify/webhooks';
import { logger } from '~/lib/utils/logger';
import { db } from '~/lib/utils/db';

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

    // Find the shop we just created
    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (shopRecord) {
      await registerWebhooks(shopRecord.id);
    }

    logger.info('Shop installed with webhooks', { shop });

    return redirect('/installation-success');
  } catch (error) {
    logger.error('OAuth callback failed', { error, shop });
    throw new Response('Installation failed', { status: 500 });
  }
}
