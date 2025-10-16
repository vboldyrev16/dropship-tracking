import { Job } from 'bullmq';
import { logger } from '../lib/utils/logger';
import { processRegisterTracking } from './jobs/register-tracking';
import { processEvent } from './jobs/process-event';
import { updateTrackingStatus } from './jobs/update-tracking-status';

export async function processJob(job: Job): Promise<void> {
  logger.info('Processing job', { name: job.name, id: job.id });

  switch (job.name) {
    case 'register-tracking':
      await processRegisterTracking(job);
      break;
    case 'process-event':
      await processEvent(job);
      break;
    case 'update-status':
      await updateTrackingStatus(job);
      break;
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}
