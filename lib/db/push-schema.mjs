import { drizzle } from "drizzle-orm/pg";
import { migrate } from "drizzle-orm/pg/migrator";
import pg from "pg";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

// Read schema and create tables
import { usersTable, favoriteSubstitutesTable, savedRecipesTable, substitutionHistoryTable, brandCacheTable, otpCodesTable } from "./src/schema/users.ts";
import { ingredientsTable } from "./src/schema/ingredients.ts";

async function push() {
  try {
    // Create tables using raw SQL from drizzle schema
    const client = await pool.connect();
    try {
      // Enable pgcrypto for UUID generation
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      
      // Create tables
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY,
          "username" text NOT NULL UNIQUE,
          "email" text NOT NULL UNIQUE,
          "password_hash" text NOT NULL,
          "profile_picture" text,
          "dietary_preferences" text[],
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "favorite_substitutes" (
          "id" serial PRIMARY KEY,
          "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "ingredient" text NOT NULL,
          "substitute" text NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "saved_recipes" (
          "id" serial PRIMARY KEY,
          "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "recipe_text" text NOT NULL,
          "result_json" jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "substitution_history" (
          "id" serial PRIMARY KEY,
          "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "ingredient" text NOT NULL,
          "substitute" text NOT NULL,
          "action" text NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "brand_cache" (
          "id" serial PRIMARY KEY,
          "search_key" text NOT NULL UNIQUE,
          "brands_data" jsonb NOT NULL,
          "source" text NOT NULL,
          "result_count" integer NOT NULL,
          "fetched_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "otp_codes" (
          "id" serial PRIMARY KEY,
          "email" text NOT NULL,
          "otp" text NOT NULL,
          "expires_at" timestamp NOT NULL,
          "used" text DEFAULT 'false',
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      await client.query(sql`
        CREATE TABLE IF NOT EXISTS "ingredients" (
          "id" serial PRIMARY KEY,
          "name" text NOT NULL UNIQUE,
          "category" text,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      
      console.log("All tables created successfully!");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to create tables:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

push();
