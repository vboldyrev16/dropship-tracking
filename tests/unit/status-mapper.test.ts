import { describe, it, expect } from 'vitest';
import { mapToCanonical, determineCanonicalStatus } from '../../app/lib/status/mapper';

describe('Status Mapper', () => {
  describe('mapToCanonical', () => {
    it('maps 17TRACK InfoReceived to ordered', () => {
      expect(mapToCanonical('InfoReceived', '17track')).toBe('ordered');
    });

    it('maps 17TRACK InTransit to in_transit', () => {
      expect(mapToCanonical('InTransit', '17track')).toBe('in_transit');
    });

    it('maps 17TRACK OutForDelivery to out_for_delivery', () => {
      expect(mapToCanonical('OutForDelivery', '17track')).toBe('out_for_delivery');
    });

    it('maps 17TRACK Delivered to delivered', () => {
      expect(mapToCanonical('Delivered', '17track')).toBe('delivered');
    });

    it('maps 17TRACK AvailableForPickup to out_for_delivery', () => {
      expect(mapToCanonical('AvailableForPickup', '17track')).toBe('out_for_delivery');
    });

    it('defaults unknown codes to in_transit', () => {
      expect(mapToCanonical('UnknownCode', '17track')).toBe('in_transit');
    });

    it('maps shopify provider to ordered', () => {
      expect(mapToCanonical('anything', 'shopify')).toBe('ordered');
    });
  });

  describe('determineCanonicalStatus', () => {
    it('returns ordered for empty events', () => {
      expect(determineCanonicalStatus([])).toBe('ordered');
    });

    it('determines delivered from event list', () => {
      const events = [
        { statusCode: 'InTransit', occurredAt: '2024-01-01T10:00:00Z' },
        { statusCode: 'Delivered', occurredAt: '2024-01-02T10:00:00Z' },
      ];
      expect(determineCanonicalStatus(events)).toBe('delivered');
    });

    it('uses latest non-delivered status', () => {
      const events = [
        { statusCode: 'InfoReceived', occurredAt: '2024-01-01T10:00:00Z' },
        { statusCode: 'InTransit', occurredAt: '2024-01-02T10:00:00Z' },
      ];
      expect(determineCanonicalStatus(events)).toBe('in_transit');
    });

    it('prioritizes delivered even if not latest', () => {
      const events = [
        { statusCode: 'Delivered', occurredAt: '2024-01-01T10:00:00Z' },
        { statusCode: 'InTransit', occurredAt: '2024-01-02T10:00:00Z' },
      ];
      expect(determineCanonicalStatus(events)).toBe('delivered');
    });

    it('handles single event', () => {
      const events = [
        { statusCode: 'OutForDelivery', occurredAt: '2024-01-01T10:00:00Z' },
      ];
      expect(determineCanonicalStatus(events)).toBe('out_for_delivery');
    });

    it('handles events without statusCode', () => {
      const events = [
        { occurredAt: '2024-01-01T10:00:00Z' },
      ];
      expect(determineCanonicalStatus(events)).toBe('in_transit');
    });
  });
});
