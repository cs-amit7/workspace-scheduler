import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

export const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI cannot be empty'),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(1, 'JWT_SECRET cannot be empty'),
  GOOGLE_CLIENT_ID: z
    .string({ required_error: 'GOOGLE_CLIENT_ID is required' })
    .min(1, 'GOOGLE_CLIENT_ID cannot be empty'),
  GOOGLE_CLIENT_SECRET: z
    .string({ required_error: 'GOOGLE_CLIENT_SECRET is required' })
    .min(1, 'GOOGLE_CLIENT_SECRET cannot be empty'),
  GOOGLE_CALLBACK_URL: z
    .string({ required_error: 'GOOGLE_CALLBACK_URL is required' })
    .min(1, 'GOOGLE_CALLBACK_URL cannot be empty'),
  CLIENT_URL: z
    .string({ required_error: 'CLIENT_URL is required' })
    .min(1, 'CLIENT_URL cannot be empty'),
  ADMIN_EMAILS: z.string().default(''),
  ENABLE_DEMO_ADMIN: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
      if (typeof val === 'boolean') return val;
      return false;
    }, z.boolean())
    .default(false),
});

export function parseEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const messages = issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }
  return result.data;
}

export const config = parseEnv(process.env);
export default config;
