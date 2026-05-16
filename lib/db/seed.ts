import { config } from "dotenv";
import path from "path";
import { execSync } from "child_process";
import { sql } from "drizzle-orm";
import { db } from "./src/index";

config({ path: path.resolve(process.cwd(), "../../.env") });

async function seed() {
  try {
    if (!db) {
      throw new Error("Database unavailable. Check DATABASE_URL.");
    }

    console.log("Truncating substitution engine tables...");
    await db.execute(
      sql`TRUNCATE TABLE feedback, substitutions, nutrition, ingredient_aliases, ingredient_roles, ingredients RESTART IDENTITY CASCADE`
    );

    const rootPath = path.resolve(process.cwd(), "../../");
    const aliasImporter = path.join(rootPath, "scripts/importers/aliases.ts");
    const usdaImporter = path.join(rootPath, "scripts/importers/usda.ts");
    const substitutionImporter = path.join(rootPath, "scripts/importers/substitutions.ts");

    console.log("Importing ingredient aliases...");
    execSync(`pnpm --filter @workspace/db exec tsx "${aliasImporter}"`, { cwd: rootPath, stdio: "inherit" });

    console.log("Importing USDA datasets (Foundation + SR Legacy)...");
    execSync(`pnpm --filter @workspace/db exec tsx "${usdaImporter}"`, { cwd: rootPath, stdio: "inherit" });

    console.log("Importing substitution pairs...");
    execSync(`pnpm --filter @workspace/db exec tsx "${substitutionImporter}"`, { cwd: rootPath, stdio: "inherit" });

    console.log("Seed complete.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
