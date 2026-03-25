import type { Config } from "drizzle-kit";
import { ConfigService } from "@nestjs/config";

const config = new ConfigService();

export default {
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: config.get<string>("DATABASE_HOST")!,
    port: Number(config.get<string>("DATABASE_PORT"))!,
    user: config.get<string>("DATABASE_USER")!,
    password: config.get<string>("DATABASE_PASSWORD")!,
    database: config.get<string>("DATABASE_NAME")!,
  },
} satisfies Config;
