import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

loadEnv({ path: ".env" });

function readConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const user = process.env.DATABASE_USER ?? "easypay";
  const password = process.env.DATABASE_PASSWORD ?? "easypay";
  const host = process.env.DATABASE_HOST ?? "localhost";
  const port = process.env.DATABASE_PORT ?? "5432";
  const dbName = process.env.DATABASE_NAME ?? "easypay";
  return `postgres://${user}:${password}@${host}:${port}/${dbName}`;
}

const client = postgres(readConnectionString());

export const db = drizzle(client, { schema });

export { schema };
