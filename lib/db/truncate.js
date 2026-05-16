import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../.env") });
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function truncate() {
  const tables = ['ingredients', 'substitutions', 'nutrition', 'feedback', 'ingredient_aliases', 'ingredient_roles'];
  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`Truncated ${table}`);
    } catch (e) {
      console.log(`Failed to truncate ${table}: ${e.message}`);
    }
  }
  process.exit(0);
}
truncate();
