import fs from "fs";
import path from "path";
import { db, substitutionsTable } from "../../lib/db/src/index";

const repoRoot = fs.existsSync(path.join(process.cwd(), "substitution_dataset"))
  ? process.cwd()
  : path.resolve(process.cwd(), "../../");

const JSON_FILE = path.join(repoRoot, "substitution_dataset/archive (4)/substitution_pairs.json");

function sanitize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function run() {
  console.log("🌱 Starting Substitution Dataset Import...");

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`File not found: ${JSON_FILE}`);
    process.exit(1);
  }

  console.log("Loading JSON into memory (this may take a moment)...");
  const rawData = fs.readFileSync(JSON_FILE, "utf-8");
  const pairs: Array<{ ingredient: string; substitution: string }> = JSON.parse(rawData);

  console.log(`Loaded ${pairs.length} substitution pairs. Processing and deduplicating...`);

  const seen = new Set<string>();
  const uniquePairs: Array<{ originalIngredient: string; substituteIngredient: string; confidence: number; source: string }> = [];

  for (const pair of pairs) {
    if (!pair.ingredient || !pair.substitution) continue;

    const orig = sanitize(pair.ingredient).toLowerCase();
    const sub = sanitize(pair.substitution).toLowerCase();

    // Skip self-substitutions
    if (orig === sub) continue;

    const key = `${orig}|${sub}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePairs.push({
        originalIngredient: orig,
        substituteIngredient: sub,
        confidence: 0.8, // Arbitrary starting confidence for verified datasets
        source: "substitution_dataset",
      });
    }
  }

  console.log(`Found ${uniquePairs.length} unique substitution pairs. Inserting in batches...`);

  const batchSize = 1000;
  for (let i = 0; i < uniquePairs.length; i += batchSize) {
    const batch = uniquePairs.slice(i, i + batchSize);
    try {
      await db.insert(substitutionsTable).values(batch).onConflictDoNothing();
    } catch (err) {
      console.error(`Error inserting batch ${i}:`, err);
    }
    
    if (i % 10000 === 0) {
      console.log(`Inserted ${i} / ${uniquePairs.length} pairs...`);
    }
  }

  console.log("✅ Substitution Dataset Import Complete!");
  process.exit(0);
}

run().catch(console.error);
