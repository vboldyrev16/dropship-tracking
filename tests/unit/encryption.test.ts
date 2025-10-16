import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../app/lib/security/encryption';

describe('Encryption', () => {
  it('encrypts and decrypts correctly', () => {
    const original = 'shpat_1234567890abcdef';
    const encrypted = encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('produces different ciphertext each time', () => {
    const text = 'test-token';
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(text);
    expect(decrypt(encrypted2)).toBe(text);
  });

  it('encrypts empty string', () => {
    const original = '';
    const encrypted = encrypt(original);

    expect(decrypt(encrypted)).toBe(original);
  });

  it('encrypts long string', () => {
    const original = 'a'.repeat(1000);
    const encrypted = encrypt(original);

    expect(decrypt(encrypted)).toBe(original);
  });

  it('encrypts special characters', () => {
    const original = '!@#$%^&*()_+-={}[]|:";\'<>?,./~`';
    const encrypted = encrypt(original);

    expect(decrypt(encrypted)).toBe(original);
  });
});
