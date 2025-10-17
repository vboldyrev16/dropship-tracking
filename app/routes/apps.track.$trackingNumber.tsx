import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData, isRouteErrorResponse, useRouteError } from '@remix-run/react';
import { verifyAppProxySignature, extractShopDomain } from '~/lib/security/app-proxy-hmac';
import { db } from '~/lib/utils/db';
import { getOrder } from '~/lib/shopify/client';
import { logger } from '~/lib/utils/logger';
import { TrackingHeader } from '~/components/tracking/TrackingHeader';
import { OrderSummary } from '~/components/tracking/OrderSummary';
import { LastMileCard } from '~/components/tracking/LastMileCard';
import { ProductList } from '~/components/tracking/ProductList';
import { EventTimeline } from '~/components/tracking/EventTimeline';
import { EmptyState } from '~/components/ui/EmptyState';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryParams = new URLSearchParams(url.search);

  // Verify App Proxy signature
  if (!verifyAppProxySignature(queryParams)) {
    logger.warn('Invalid App Proxy signature');
    throw new Response('Unauthorized', { status: 401 });
  }

  const shopDomain = extractShopDomain(queryParams);
  if (!shopDomain) {
    throw new Response('Missing shop domain', { status: 400 });
  }

  const trackingNumber = params.trackingNumber;
  if (!trackingNumber) {
    throw new Response('Missing tracking number', { status: 400 });
  }

  // Find shop
  const shop = await db.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    throw new Response('Shop not found', { status: 404 });
  }

  // Find tracking with related data
  const tracking = await db.tracking.findUnique({
    where: { shopId_trackingNumber: { shopId: shop.id, trackingNumber } },
    include: {
      order: true,
      redactedEvents: {
        orderBy: { occurredAt: 'desc' },
      },
    },
  });

  if (!tracking) {
    return json({ notFound: true, trackingNumber });
  }

  // Fetch order line items from Shopify
  let products: any[] = [];
  if (tracking.order) {
    try {
      const orderData = await getOrder(shop.id, tracking.order.shopifyOrderId);
      products = orderData.lineItems.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        quantity: edge.node.quantity,
        imageUrl: edge.node.image?.url || null,
      }));
    } catch (error) {
      logger.error('Failed to fetch order line items', { error, orderId: tracking.order.shopifyOrderId });
    }
  }

  return json({
    notFound: false,
    tracking: {
      trackingNumber: tracking.trackingNumber,
      status: tracking.status,
      orderName: tracking.order?.orderName || 'N/A',
      lastMileSlug: tracking.lastMileSlug,
      lastMileTracking: tracking.lastMileTracking,
      lastMileUrl: tracking.lastMileUrl,
    },
    events: tracking.redactedEvents.map(e => ({
      id: e.id,
      messageRedacted: e.messageRedacted,
      occurredAt: e.occurredAt.toISOString(),
    })),
    products,
  });
}

export default function TrackingPage() {
  const data = useLoaderData<typeof loader>();

  if (data.notFound) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <TrackingHeader />
        <EmptyState message="We can't find this tracking number yet. Check the number or try again later." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <TrackingHeader />
      <OrderSummary
        orderName={data.tracking.orderName}
        status={data.tracking.status as any}
        trackingNumber={data.tracking.trackingNumber}
      />
      <LastMileCard
        carrierName={data.tracking.lastMileSlug}
        trackingNumber={data.tracking.lastMileTracking}
        url={data.tracking.lastMileUrl}
      />
      <ProductList products={data.products} />
      <EventTimeline events={data.events} />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error {error.status}</h1>
          <p className="text-red-700">{error.statusText || 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-red-900 mb-2">Unexpected Error</h1>
        <p className="text-red-700">Please try again later.</p>
      </div>
    </div>
  );
}
