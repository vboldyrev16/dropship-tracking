import { Job } from 'bullmq';
import { db } from '../../lib/utils/db';
import { logger } from '../../lib/utils/logger';
import { registerTracking } from '../../lib/providers/17track';
import { RegisterTrackingJob } from '../types';

export async function processRegisterTracking(job: Job<RegisterTrackingJob>): Promise<void> {
  const { trackingId } = job.data;

  const tracking = await db.tracking.findUnique({ where: { id: trackingId } });
  if (!tracking) {
    logger.error('Tracking not found for registration', { trackingId });
    return;
  }

  if (tracking.registeredWith17Track) {
    logger.info('Already registered with 17TRACK', { trackingId });
    return;
  }

  try {
    await registerTracking(tracking.trackingNumber, tracking.carrierSlug || undefined);
    await db.tracking.update({
      where: { id: trackingId },
      data: { registeredWith17Track: true },
    });
    logger.info('Successfully registered tracking', { trackingId });
  } catch (error) {
    logger.error('Failed to register tracking', { trackingId, error });
    throw error; // Re-throw to trigger retry
  }
}
