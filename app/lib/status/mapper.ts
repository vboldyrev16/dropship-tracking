import { CanonicalStatus, LastMileInfo } from './types';

// 17TRACK status codes (simplified for MVP)
// Real codes: https://api.17track.net/en/doc
const STATUS_MAP: Record<string, CanonicalStatus> = {
  'InfoReceived': 'ordered',
  'InTransit': 'in_transit',
  'OutForDelivery': 'out_for_delivery',
  'Delivered': 'delivered',
  'AvailableForPickup': 'out_for_delivery',
  'Expired': 'in_transit',
  'Failed': 'in_transit',
};

export function mapToCanonical(
  providerStatus: string,
  provider: 'shopify' | '17track'
): CanonicalStatus {
  if (provider === '17track') {
    return STATUS_MAP[providerStatus] || 'in_transit';
  }

  // Shopify fallback
  return 'ordered';
}

export function determineCanonicalStatus(events: any[]): CanonicalStatus {
  if (!events.length) return 'ordered';

  // Sort by occurredAt desc to get latest
  const sorted = [...events].sort((a, b) =>
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  // Once delivered, always delivered (unless reversed)
  const hasDelivered = sorted.some(e => e.statusCode === 'Delivered');
  if (hasDelivered) return 'delivered';

  // Check latest status
  const latest = sorted[0];
  return mapToCanonical(latest.statusCode || '', '17track');
}

export function extractLastMileInfo(rawEvents: any[]): LastMileInfo | null {
  // TODO: Implement parsing of 17TRACK event payload for last-mile info
  // For now, return null
  return null;
}
