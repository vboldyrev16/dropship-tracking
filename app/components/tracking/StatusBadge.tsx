import { CanonicalStatus } from '~/lib/status/types';

const STATUS_CONFIG: Record<CanonicalStatus, { label: string; color: string }> = {
  ordered: { label: 'Ordered', color: 'bg-gray-200 text-gray-800' },
  order_ready: { label: 'Order Ready', color: 'bg-blue-200 text-blue-800' },
  in_transit: { label: 'In Transit', color: 'bg-yellow-200 text-yellow-800' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-purple-200 text-purple-800' },
  delivered: { label: 'Delivered', color: 'bg-green-200 text-green-800' },
};

export function StatusBadge({ status }: { status: CanonicalStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
