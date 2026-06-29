import fs from "fs";
import { Pool } from "pg";

async function addBillingMenu() {
  const sql = fs.readFileSync(
    new URL("../add-billing-menu.sql", import.meta.url),
    "utf8",
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("Billing menu added successfully");
  } catch (err) {
    console.error("Failed to add billing menu:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addBillingMenu();
