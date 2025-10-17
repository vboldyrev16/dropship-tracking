import { z } from 'zod';

const envSchema = z.object({
  // Optional until Shopify app is configured
  SHOPIFY_API_KEY: z.string().min(1).optional(),
  SHOPIFY_API_SECRET: z.string().min(1).optional(),
  SHOPIFY_SCOPES: z.string().min(1),
  
  // Optional until 17TRACK account is set up
  SEVENTEEN_TRACK_API_KEY: z.string().min(1).optional(),
  
  // Database (required)
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  
  // We use Inngest now, not Redis
  REDIS_URL: z.string().min(1).optional(),
  
  // Security (required)
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  
  // App config
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
