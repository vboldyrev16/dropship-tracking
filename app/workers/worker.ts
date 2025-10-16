import { Worker } from 'bullmq';
import { env } from '../lib/utils/env';
import { logger } from '../lib/utils/logger';
import { processJob } from './processor';

const worker = new Worker('tracking-jobs', processJob, {
  connection: {
    host: env.REDIS_URL.includes('://')
      ? new URL(env.REDIS_URL).hostname
      : env.REDIS_URL.split(':')[0],
    port: env.REDIS_URL.includes('://')
      ? parseInt(new URL(env.REDIS_URL).port || '6379')
      : parseInt(env.REDIS_URL.split(':')[1] || '6379'),
  },
});

worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job?.id, name: job?.name });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, name: job?.name, error: err.message });
});

logger.info('Worker started');

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await worker.close();
  process.exit(0);
});
