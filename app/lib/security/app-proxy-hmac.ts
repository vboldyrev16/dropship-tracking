import crypto from 'crypto';
import { env } from '../utils/env';

export function verifyAppProxySignature(queryParams: URLSearchParams): boolean {
  const signature = queryParams.get('signature');
  if (!signature) return false;

  // Get all params except signature
  const params = Array.from(queryParams.entries())
    .filter(([key]) => key !== 'signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('');

  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(params, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(hash);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

export function extractShopDomain(queryParams: URLSearchParams): string | null {
  return queryParams.get('shop');
}
