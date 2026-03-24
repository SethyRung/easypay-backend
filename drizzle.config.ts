import type { Config } from "drizzle-kit";
import { ConfigService } from "@nestjs/config";

const config = new ConfigService();

export default {
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: config.get<string>("DATABASE_HOST") || "localhost",
    port: Number(config.get<string>("DATABASE_PORT")) || 5432,
    user: config.get<string>("DATABASE_USER") || "easypay",
    password: config.get<string>("DATABASE_PASSWORD") || "easypay",
    database: config.get<string>("DATABASE_NAME") || "easypay",
  },
} satisfies Config;
