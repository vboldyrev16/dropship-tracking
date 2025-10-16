import { Job } from 'bullmq';
import { db } from '../../lib/utils/db';
import { logger } from '../../lib/utils/logger';
import { determineCanonicalStatus, extractLastMileInfo } from '../../lib/status/mapper';
import { UpdateStatusJob } from '../types';

export async function updateTrackingStatus(job: Job<UpdateStatusJob>): Promise<void> {
  const { trackingId } = job.data;

  const tracking = await db.tracking.findUnique({
    where: { id: trackingId },
    include: { redactedEvents: true, rawEvents: true },
  });

  if (!tracking) {
    logger.error('Tracking not found for status update', { trackingId });
    return;
  }

  // Determine canonical status
  const newStatus = determineCanonicalStatus(tracking.redactedEvents);

  // Extract last-mile info (if available)
  const rawEventsData = tracking.rawEvents.map(e => JSON.parse(e.payloadJson));
  const lastMile = extractLastMileInfo(rawEventsData);

  // Update tracking
  await db.tracking.update({
    where: { id: trackingId },
    data: {
      status: newStatus,
      lastMileSlug: lastMile?.carrierSlug || tracking.lastMileSlug,
      lastMileTracking: lastMile?.trackingNumber || tracking.lastMileTracking,
      lastMileUrl: lastMile?.url || tracking.lastMileUrl,
    },
  });

  logger.info('Tracking status updated', { trackingId, newStatus });
}
