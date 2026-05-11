import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.error("Failed to initialize database connection:", err);
    pool = null;
    db = null;
  }
} else {
  console.warn(
    "WARNING: DATABASE_URL is not set. Database features will be unavailable. " +
    "Set DATABASE_URL in your .env file to enable database connectivity."
  );
}

export { pool, db };
export * from "./schema";
