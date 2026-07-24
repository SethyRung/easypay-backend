import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.string().default('8080'),

    DATABASE_URL: z.string().default(''),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),

    TRANSFER_FEE_MINOR: z.string().default('200'),
    TOPUP_MAX_PER_TX_MINOR: z.string().default('100000'),
    TOPUP_MAX_DAILY_MINOR: z.string().default('500000'),

    BRIDGE_SHARED_SECRET: z.string().min(32),
    GLITCH_BASE_URL: z.url(),

    CORS_ORIGIN: z.string().default('*'),
  })
  .readonly();

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error(
      'Invalid environment variables:',
      z.treeifyError(result.error),
    );
    throw new Error('Invalid environment variables');
  }

  return result.data;
}
