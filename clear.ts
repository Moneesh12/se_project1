import "dotenv/config";
import pg from "pg";

async function clear() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("TRUNCATE TABLE ingredients CASCADE;");
  await pool.query("TRUNCATE TABLE substitutions CASCADE;");
  await pool.query("TRUNCATE TABLE nutrition CASCADE;");
  await pool.query("TRUNCATE TABLE feedback CASCADE;");
  try {
    await pool.query("TRUNCATE TABLE ingredient_aliases CASCADE;");
  } catch (err) {
    // Table might not exist yet
  }
  console.log("Truncated all tables");
  process.exit(0);
}
clear();
