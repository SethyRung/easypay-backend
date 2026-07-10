import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().default("8080"),

    DATABASE_HOST: z.string().default("localhost"),
    DATABASE_PORT: z.string().default("5432"),
    DATABASE_USER: z.string().default("easypay"),
    DATABASE_PASSWORD: z.string().default("easypay"),
    DATABASE_NAME: z.string().default("easypay"),

    // JWT secrets MUST be set explicitly. Do not rely on defaults in any environment.
    // Generate strong random values for production, e.g. `openssl rand -base64 48`.
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRATION: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_REFRESH_EXPIRATION: z.string().default("7d"),

    // Flat per-transfer fee in minor units (e.g. 200 = ₹2). Set to "0" to disable.
    TRANSFER_FEE_MINOR: z.string().default("200"),
    TOPUP_MAX_PER_TX_MINOR: z.string().default("100000"),
    TOPUP_MAX_DAILY_MINOR: z.string().default("500000"),

    // Bridge to glitch B2B federation (see BRIDGE_AUTH.md).
    // Shared HMAC salt: 32+ random chars. Same value must be set on the glitch side.
    //   openssl rand -base64 48
    NUXT_BRIDGE_SHARED_SECRET: z.string().min(32),
    // Base URL of the glitch instance that receives bridge-issue requests.
    GLITCH_BASE_URL: z.string().url(),

    CORS_ORIGIN: z.string().default("*"),
  })
  .readonly();

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error("Invalid environment variables:", z.treeifyError(result.error));
    throw new Error("Invalid environment variables");
  }

  return result.data;
}
