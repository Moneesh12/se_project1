/**
 * Drop-and-recreate migration script.
 * Drops all existing tables, then pushes the new schema.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:monu@127.0.0.1:5432/recipe_sub";

async function migrate() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("🗑️  Dropping existing tables...");
  await client.query(`
    DROP TABLE IF EXISTS feedback CASCADE;
    DROP TABLE IF EXISTS substitutions CASCADE;
    DROP TABLE IF EXISTS nutrition CASCADE;
    DROP TABLE IF EXISTS ingredient_aliases CASCADE;
    DROP TABLE IF EXISTS ingredient_roles CASCADE;
    DROP TABLE IF EXISTS ingredients CASCADE;
  `);

  console.log("🔨 Creating tables...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      canonical_name TEXT,
      category TEXT NOT NULL,
      functional_role TEXT
    );

    CREATE TABLE IF NOT EXISTS nutrition (
      id SERIAL PRIMARY KEY,
      ingredient_id INTEGER NOT NULL,
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      sugar REAL,
      sodium REAL
    );

    CREATE TABLE IF NOT EXISTS substitutions (
      id SERIAL PRIMARY KEY,
      original_ingredient TEXT NOT NULL,
      substitute_ingredient TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      source TEXT DEFAULT 'seed'
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      ingredient TEXT NOT NULL,
      substitute TEXT NOT NULL,
      rating INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingredient_aliases (
      id SERIAL PRIMARY KEY,
      alias TEXT NOT NULL UNIQUE,
      canonical_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingredient_roles (
      id SERIAL PRIMARY KEY,
      ingredient_name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL
    );
  `);

  console.log("✅ Migration complete!");
  await client.end();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
