import crypto from 'crypto';
import { env } from '../utils/env';

export function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  if (!hmacHeader) return false;

  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  const expectedBuffer = Buffer.from(hash);
  const receivedBuffer = Buffer.from(hmacHeader);

  // Ensure buffers are the same length for timingSafeEqual
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
