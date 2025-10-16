export type CanonicalStatus =
  | 'ordered'
  | 'order_ready'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered';

export interface LastMileInfo {
  carrierSlug: string;
  trackingNumber: string;
  url?: string;
}
