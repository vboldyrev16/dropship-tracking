import { env } from '../utils/env';
import { db } from '../utils/db';
import { encrypt } from '../security/encryption';

export function buildAuthUrl(shop: string): string {
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY!,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: `${env.APP_URL}/auth/callback`,
    state: generateNonce(),
    grant_options: '[]', // Required for online access mode
  });

  return `https://${shop}/admin/oauth/authorize?${params}`;
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function storeShopCredentials(
  shop: string,
  accessToken: string
): Promise<void> {
  const encryptedToken = encrypt(accessToken);

  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken: encryptedToken },
    create: {
      shopDomain: shop,
      accessToken: encryptedToken,
    },
  });
}
