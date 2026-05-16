import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), "../../.env") });
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function drop() {
  try {
    await pool.query(`DROP SCHEMA public CASCADE;`);
    await pool.query(`CREATE SCHEMA public;`);
    await pool.query(`GRANT ALL ON SCHEMA public TO postgres;`);
    await pool.query(`GRANT ALL ON SCHEMA public TO public;`);
    console.log(`Dropped and recreated public schema`);
  } catch (e) {
    console.log(`Failed to recreate schema: ${e.message}`);
  }
  process.exit(0);
}
drop();
