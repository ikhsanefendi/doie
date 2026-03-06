import fs from "fs";
import { Pool } from "pg";

async function run() {
  const sql = fs.readFileSync(
    new URL("./01-init-schema.sql", import.meta.url),
    "utf8",
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("Schema initialized successfully");
  } catch (err) {
    console.error("Schema initialization failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
