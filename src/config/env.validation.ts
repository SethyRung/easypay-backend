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

    JWT_ACCESS_SECRET: z.string().default("acceess-secret"),
    JWT_ACCESS_EXPIRATION: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().default("refresh-secret"),
    JWT_REFRESH_EXPIRATION: z.string().default("7d"),

    TRANSFER_FEE_MINOR: z.string().default("0"),
    TOPUP_MAX_PER_TX_MINOR: z.string().default("100000"),
    TOPUP_MAX_DAILY_MINOR: z.string().default("500000"),

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
