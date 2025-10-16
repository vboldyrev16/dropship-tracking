import { type ActionFunctionArgs, json } from '@remix-run/node';
import { parseWebhookPayload, storeRawEvents } from '~/lib/providers/17track';
import { inngest } from '~/inngest/client';
import { logger } from '~/lib/utils/logger';

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.text();
  const payload = JSON.parse(body);

  // TODO: Verify signature if 17TRACK provides it
  logger.info('17TRACK webhook received');

  try {
    const events = parseWebhookPayload(payload);
    const eventIds = await storeRawEvents(events);

    // Send events to Inngest for processing
    await inngest.send(
      eventIds.map(eventId => ({
        name: 'tracking/event.process',
        data: { rawEventId: eventId },
      }))
    );

    logger.info('Events stored and sent to Inngest', { count: eventIds.length });
  } catch (error) {
    logger.error('17TRACK webhook processing failed', { error });
    return json({ error: 'Processing failed' }, { status: 500 });
  }

  return json({ success: true });
}
