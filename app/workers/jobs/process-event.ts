import { Job } from 'bullmq';
import { db } from '../../lib/utils/db';
import { logger } from '../../lib/utils/logger';
import { applyRedaction } from '../../lib/redaction/engine';
import { trackingQueue } from '../queue';
import { ProcessEventJob } from '../types';

export async function processEvent(job: Job<ProcessEventJob>): Promise<void> {
  const { eventRawId } = job.data;

  const rawEvent = await db.eventRaw.findUnique({ where: { id: eventRawId } });
  if (!rawEvent) {
    logger.error('Raw event not found', { eventRawId });
    return;
  }

  const eventData = JSON.parse(rawEvent.payloadJson);

  // Apply redaction to message and location
  const messageRedacted = applyRedaction(eventData.message || '');
  const cityRedacted = eventData.location ? applyRedaction(eventData.location) : null;

  // Create redacted event
  await db.eventRedacted.create({
    data: {
      trackingId: rawEvent.trackingId,
      statusCode: eventData.statusCode || null,
      messageRedacted,
      cityRedacted,
      countryRedacted: null, // Country info usually in message
      occurredAt: rawEvent.occurredAt,
    },
  });

  logger.info('Event redacted and stored', { eventRawId, trackingId: rawEvent.trackingId });

  // Trigger status update
  await trackingQueue.add('update-status', { trackingId: rawEvent.trackingId });
}
