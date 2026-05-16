import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { db, ingredientAliasesTable } from "../../lib/db/src/index";

const repoRoot = fs.existsSync(path.join(process.cwd(), "substitution_dataset"))
  ? process.cwd()
  : path.resolve(process.cwd(), "../../");

const CSV_FILE = path.join(repoRoot, "substitution_dataset/archive (4)/original_to_processed_mapping.csv");

async function parseCSV<T>(filename: string, onRow: (row: any) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(csv())
      .on("data", onRow)
      .on("end", resolve)
      .on("error", reject);
  });
}

function sanitize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ") // Keep only printable ASCII
    .replace(/\s+/g, " ")
    .trim();
}

async function run() {
  console.log("🌱 Starting Ingredient Aliases Import...");

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`File not found: ${CSV_FILE}`);
    process.exit(1);
  }

  const aliases = new Map<string, string>();

  console.log("Parsing original_to_processed_mapping.csv...");
  await parseCSV(CSV_FILE, (row) => {
    const original = sanitize(row.original || "").toLowerCase();
    const processed = sanitize(row.processed || "").toLowerCase();
    
    // We only care about actual mappings, not identity
    if (original && processed && original !== processed) {
      aliases.set(original, processed);
    }
  });

  console.log(`Found ${aliases.size} alias mappings. Inserting into database in batches...`);

  const aliasesArray = Array.from(aliases.entries()).map(([alias, canonicalName]) => ({
    alias,
    canonicalName,
  }));

  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < aliasesArray.length; i += batchSize) {
    const batch = aliasesArray.slice(i, i + batchSize);
    try {
      await db.insert(ingredientAliasesTable).values(batch).onConflictDoNothing();
      inserted += batch.length;
    } catch (err) {
      console.error(`Batch insert error at index ${i}:`, err);
    }

    if (i % 10000 === 0) {
      console.log(`Inserted ${i} / ${aliasesArray.length} aliases...`);
    }
  }

  console.log(`✅ Aliases Import Complete! Inserted ${inserted} records.`);
  process.exit(0);
}

run().catch(console.error);
