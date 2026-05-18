import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

let configDir: string;
try {
  configDir = path.dirname(fileURLToPath(import.meta.url));
} catch {
  configDir = process.cwd();
}
config({ path: path.resolve(configDir, "../../.env") });
import { defineConfig } from "drizzle-kit";

const schemaDir = path.resolve(configDir, "src/schema");

export default defineConfig({
  schema: [
    path.resolve(schemaDir, "users.ts"),
    path.resolve(schemaDir, "ingredients.ts"),
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/recipe_sub",
  },
});
