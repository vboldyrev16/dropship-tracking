interface Props {
  carrierName?: string | null;
  trackingNumber?: string | null;
  url?: string | null;
}

export function LastMileCard({ carrierName, trackingNumber, url }: Props) {
  if (!carrierName || !trackingNumber) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-gray-500 text-sm">Last-mile carrier information not yet available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-2">Delivered by {carrierName}</h3>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Track with {carrierName}: {trackingNumber}
        </a>
      ) : (
        <p className="text-gray-600">Tracking: {trackingNumber}</p>
      )}
    </div>
  );
}
