import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const version = "001_initial";
  const existing = await pool.query("SELECT version FROM schema_migrations WHERE version = $1", [version]);
  if (existing.rowCount === 0) {
    const sql = await readFile(resolve(here, "../migrations/001_initial.sql"), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [version]);
      await client.query("COMMIT");
      console.log(`Applied migration ${version}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } else {
    console.log(`Migration ${version} already applied`);
  }
} finally {
  await pool.end();
}
