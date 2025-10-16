import { describe, it, expect } from 'vitest';
import { redactText, shouldUsePlaceholder, applyRedaction } from '../../app/lib/redaction/engine';

describe('Redaction Engine', () => {
  describe('redactText', () => {
    it('removes China from text', () => {
      expect(redactText('Departed from China')).toBe('Departed from');
    });

    it('removes city names', () => {
      expect(redactText('Arrived in Shenzhen')).toBe('Arrived in');
    });

    it('removes CN code', () => {
      expect(redactText('Origin: CN')).toBe('Origin:');
    });

    it('handles multiple terms', () => {
      expect(redactText('Package left Shenzhen, China')).toBe('Package left');
    });

    it('is case-insensitive', () => {
      expect(redactText('CHINA china China')).toBe('');
    });

    it('preserves text without China terms', () => {
      expect(redactText('Package arrived at destination')).toBe('Package arrived at destination');
    });

    it('removes province names', () => {
      expect(redactText('Sorting center in Guangdong')).toBe('Sorting center in');
    });

    it('handles empty string', () => {
      expect(redactText('')).toBe('');
    });

    it('collapses multiple spaces', () => {
      expect(redactText('Item    from    China')).toBe('Item from');
    });
  });

  describe('shouldUsePlaceholder', () => {
    it('detects when placeholder needed for empty string', () => {
      expect(shouldUsePlaceholder('')).toBe(true);
    });

    it('detects when placeholder needed for whitespace', () => {
      expect(shouldUsePlaceholder('   ')).toBe(true);
    });

    it('detects when placeholder needed for punctuation only', () => {
      expect(shouldUsePlaceholder(',.-')).toBe(true);
    });

    it('returns false for valid text', () => {
      expect(shouldUsePlaceholder('Valid text')).toBe(false);
    });

    it('returns false for single word', () => {
      expect(shouldUsePlaceholder('Valid')).toBe(false);
    });
  });

  describe('applyRedaction', () => {
    it('applies placeholder for empty result', () => {
      expect(applyRedaction('Shenzhen, China')).toBe('Processing at origin facility');
    });

    it('applies placeholder for CN only', () => {
      expect(applyRedaction('CN')).toBe('Processing at origin facility');
    });

    it('keeps valid text after redaction', () => {
      expect(applyRedaction('Departed from facility in China')).toBe('Departed from facility in');
    });

    it('preserves fully valid text', () => {
      expect(applyRedaction('Package delivered successfully')).toBe('Package delivered successfully');
    });

    it('handles multiple cities', () => {
      expect(applyRedaction('Transferred from Shanghai to Beijing')).toBe('Transferred from to');
    });

    it('handles complex sentence', () => {
      const original = 'Package departed from Shenzhen, Guangdong, China and is in transit';
      const expected = 'Package departed from , , and is in transit';
      expect(applyRedaction(original)).toBe(expected);
    });
  });
});
