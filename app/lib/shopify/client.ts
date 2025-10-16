import { env } from '../utils/env';
import { db } from '../utils/db';
import { decrypt } from '../security/encryption';
import { GET_ORDER_QUERY } from './queries';

export async function shopifyGraphQL(
  shopId: string,
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error('Shop not found');

  const accessToken = decrypt(shop.accessToken);
  const response = await fetch(
    `https://${shop.shopDomain}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

export async function getOrder(shopId: string, orderId: string) {
  const data = await shopifyGraphQL(shopId, GET_ORDER_QUERY, { id: orderId });
  return data.order;
}
