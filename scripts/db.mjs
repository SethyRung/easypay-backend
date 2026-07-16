#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";

loadEnv({ path: ".env" });

const SCHEMA = "drizzle";
const TABLE = "__drizzle_migrations";
const MIGRATIONS_DIR = "./drizzle";

function connStr() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const u = process.env.DATABASE_USER ?? "easypay";
  const p = process.env.DATABASE_PASSWORD ?? "easypay";
  const h = process.env.DATABASE_HOST ?? "localhost";
  const port = process.env.DATABASE_PORT ?? "5432";
  const db = process.env.DATABASE_NAME ?? "easypay";
  return `postgres://${u}:${p}@${h}:${port}/${db}`;
}

const c = (color, text) => `\x1b[${color}m${text}\x1b[0m`;
const green = (t) => c(32, t);
const dim = (t) => c(2, t);

const client = postgres(connStr(), { max: 1 });

try {
  await client.unsafe(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
  await client.unsafe(
    `CREATE TABLE IF NOT EXISTS "${SCHEMA}"."${TABLE}" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
  );
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
  const [{ created_at: lastTime } = {}] = await client.unsafe(
    `SELECT created_at FROM "${SCHEMA}"."${TABLE}" ORDER BY created_at DESC LIMIT 1`,
  );
  let applied = 0;
  for (const m of migrations) {
    if (lastTime !== undefined && Number(lastTime) >= m.folderMillis) {
      console.log(`  ${dim("skip")}  ${m.folderMillis}`);
      continue;
    }
    console.log(
      `  ${green("apply")} ${m.folderMillis} (${m.sql.length} statement${m.sql.length === 1 ? "" : "s"})`,
    );
    await client.begin(async (sql) => {
      for (const stmt of m.sql) await sql.unsafe(stmt);
      await sql.unsafe(`INSERT INTO "${SCHEMA}"."${TABLE}" (hash, created_at) VALUES ($1, $2)`, [
        m.hash,
        m.folderMillis,
      ]);
    });
    applied++;
  }
  console.log(
    applied === 0
      ? green("✓ database is up to date.")
      : green(`✓ applied ${applied} migration${applied === 1 ? "" : "s"}.`),
  );
} finally {
  await client.end();
}
