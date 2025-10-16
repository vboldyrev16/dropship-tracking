import { StatusBadge } from './StatusBadge';
import { CanonicalStatus } from '~/lib/status/types';

interface Props {
  orderName: string;
  status: CanonicalStatus;
  trackingNumber: string;
}

export function OrderSummary({ orderName, status, trackingNumber }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{orderName}</h2>
      </div>
      <div className="mb-4">
        <StatusBadge status={status} />
      </div>
      <div className="text-gray-600">
        <span className="font-medium">Tracking Number:</span> {trackingNumber}
      </div>
    </div>
  );
}
