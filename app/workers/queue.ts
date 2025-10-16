import { Queue } from 'bullmq';
import { env } from '../lib/utils/env';

export const trackingQueue = new Queue('tracking-jobs', {
  connection: {
    host: env.REDIS_URL.includes('://')
      ? new URL(env.REDIS_URL).hostname
      : env.REDIS_URL.split(':')[0],
    port: env.REDIS_URL.includes('://')
      ? parseInt(new URL(env.REDIS_URL).port || '6379')
      : parseInt(env.REDIS_URL.split(':')[1] || '6379'),
  },
});
