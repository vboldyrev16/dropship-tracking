import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { buildAuthUrl } from '~/lib/shopify/auth';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    throw new Response('Missing shop parameter', { status: 400 });
  }

  return redirect(buildAuthUrl(shop));
}
