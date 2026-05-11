import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "WARNING: DATABASE_URL is not set. Drizzle migrations/push will not work. " +
    "Set DATABASE_URL in your .env file."
  );
}

export default defineConfig({
  // Change from a specific file to a "glob" pattern
  schema: "C:/Users/monee/OneDrive/Desktop/Attached-Assets/lib/db/src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl || "postgresql://localhost:5432/recipe_sub",
  },
});
