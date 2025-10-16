import { describe, it, expect } from 'vitest';
import { verifyAppProxySignature, extractShopDomain } from '../../app/lib/security/app-proxy-hmac';
import crypto from 'crypto';

describe('App Proxy HMAC', () => {
  it('verifies valid signature', () => {
    const params = new URLSearchParams({
      shop: 'test-store.myshopify.com',
      timestamp: '1234567890',
      path_prefix: '/apps',
    });

    // Create param string the same way the function does
    const paramString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('');

    const secret = process.env.SHOPIFY_API_SECRET!;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(paramString, 'utf8')
      .digest('hex');

    params.set('signature', signature);

    expect(verifyAppProxySignature(params)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const params = new URLSearchParams({
      shop: 'test-store.myshopify.com',
      signature: 'invalid-signature-here',
    });

    expect(verifyAppProxySignature(params)).toBe(false);
  });

  it('returns false when signature is missing', () => {
    const params = new URLSearchParams({
      shop: 'test-store.myshopify.com',
    });

    expect(verifyAppProxySignature(params)).toBe(false);
  });

  it('extracts shop domain', () => {
    const params = new URLSearchParams({
      shop: 'test.myshopify.com'
    });

    expect(extractShopDomain(params)).toBe('test.myshopify.com');
  });

  it('returns null when shop parameter is missing', () => {
    const params = new URLSearchParams();

    expect(extractShopDomain(params)).toBeNull();
  });
});
