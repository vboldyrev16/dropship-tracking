import { describe, it, expect } from 'vitest';
import { verifyShopifyWebhook } from '../../app/lib/security/webhook-hmac';
import crypto from 'crypto';

describe('verifyShopifyWebhook', () => {
  it('returns true for valid HMAC', () => {
    const body = '{"test":"data"}';
    const secret = process.env.SHOPIFY_API_SECRET!;

    // Generate valid HMAC
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    expect(verifyShopifyWebhook(body, hash)).toBe(true);
  });

  it('returns false for invalid HMAC', () => {
    const body = '{"test":"data"}';
    const invalidHash = 'invalid-hmac-signature';

    expect(verifyShopifyWebhook(body, invalidHash)).toBe(false);
  });

  it('returns false for empty HMAC', () => {
    const body = '{"test":"data"}';

    expect(verifyShopifyWebhook(body, '')).toBe(false);
  });
});
