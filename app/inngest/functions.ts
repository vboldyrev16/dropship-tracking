import { inngest } from './client';
import { db } from '~/lib/utils/db';
import { logger } from '~/lib/utils/logger';
import { registerTracking } from '~/lib/providers/17track';
import { applyRedaction } from '~/lib/redaction/engine';
import { determineCanonicalStatus } from '~/lib/status/mapper';

// Job 1: Register tracking with 17TRACK
export const registerTrackingJob = inngest.createFunction(
  { 
    id: 'register-tracking',
    name: 'Register Tracking with 17TRACK',
    retries: 3,
  },
  { event: 'tracking/register' },
  async ({ event, step }) => {
    const { trackingId, trackingNumber } = event.data;

    return await step.run('register-with-17track', async () => {
      logger.info('Registering tracking with 17TRACK', { trackingId, trackingNumber });

      try {
        await registerTracking(trackingNumber);

        await db.tracking.update({
          where: { id: trackingId },
          data: { registeredWith17Track: true },
        });

        logger.info('Successfully registered tracking', { trackingId });
        return { success: true, trackingId };
      } catch (error) {
        logger.error('Failed to register tracking', { error, trackingId });
        throw error;
      }
    });
  }
);

// Job 2: Process raw event and create redacted event
export const processEventJob = inngest.createFunction(
  {
    id: 'process-event',
    name: 'Process and Redact Tracking Event',
    retries: 3,
  },
  { event: 'tracking/event.process' },
  async ({ event, step }) => {
    const { rawEventId } = event.data;

    const rawEvent = await step.run('fetch-raw-event', async () => {
      return await db.eventRaw.findUnique({ where: { id: rawEventId } });
    });

    if (!rawEvent) {
      logger.warn('Raw event not found', { rawEventId });
      return { success: false, error: 'Event not found' };
    }

    const redactedEvent = await step.run('apply-redaction', async () => {
      const payload = JSON.parse(rawEvent.payloadJson);
      const originalMessage = payload.message || '';
      const redactedMessage = applyRedaction(originalMessage);

      return await db.eventRedacted.create({
        data: {
          trackingId: rawEvent.trackingId,
          statusCode: payload.status || '',
          messageRedacted: redactedMessage,
          occurredAt: rawEvent.occurredAt,
        },
      });
    });

    // Trigger status update
    await step.sendEvent('trigger-status-update', {
      name: 'tracking/status.update',
      data: { trackingId: rawEvent.trackingId },
    });

    logger.info('Event processed successfully', { rawEventId, redactedEventId: redactedEvent.id });
    return { success: true, redactedEventId: redactedEvent.id };
  }
);

// Job 3: Update tracking status based on events
export const updateStatusJob = inngest.createFunction(
  {
    id: 'update-tracking-status',
    name: 'Update Tracking Status',
    retries: 2,
  },
  { event: 'tracking/status.update' },
  async ({ event, step }) => {
    const { trackingId } = event.data;

    return await step.run('determine-and-update-status', async () => {
      const tracking = await db.tracking.findUnique({
        where: { id: trackingId },
        include: {
          redactedEvents: {
            orderBy: { occurredAt: 'desc' },
          },
        },
      });

      if (!tracking) {
        logger.warn('Tracking not found for status update', { trackingId });
        return { success: false, error: 'Tracking not found' };
      }

      const newStatus = determineCanonicalStatus(tracking.redactedEvents);

      if (newStatus !== tracking.status) {
        await db.tracking.update({
          where: { id: trackingId },
          data: { status: newStatus },
        });

        logger.info('Tracking status updated', { 
          trackingId, 
          oldStatus: tracking.status, 
          newStatus 
        });
      }

      return { success: true, status: newStatus };
    });
  }
);

// Export all functions
export const functions = [
  registerTrackingJob,
  processEventJob,
  updateStatusJob,
];
