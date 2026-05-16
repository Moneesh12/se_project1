import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { db, pool, ingredientsTable } from "../../lib/db/src/index";

const repoRoot = fs.existsSync(path.join(process.cwd(), "foundations_food"))
  ? process.cwd()
  : path.resolve(process.cwd(), "../../");

const FOUNDATION_BASE = path.join(
  repoRoot,
  "foundations_food/FoodData_Central_foundation_food_csv_2026-04-30/FoodData_Central_foundation_food_csv_2026-04-30"
);
const SR_BASE = path.join(
  repoRoot,
  "sr_legacy/FoodData_Central_sr_legacy_food_csv_2018-04/FoodData_Central_sr_legacy_food_csv_2018-04"
);

const NUTRIENT_IDS = {
  calories: "1008",
  protein: "1003",
  carbs: "1005",
  fat: "1004",
  sugar: "2000",
  sodium: "1093",
} as const;

type NutKey = keyof typeof NUTRIENT_IDS;
type NutAgg = Record<NutKey, { sum: number; count: number }>;

function parseCsv(filePath: string, onRow: (row: Record<string, string>) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", onRow)
      .on("end", resolve)
      .on("error", reject);
  });
}

function sanitize(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripPlural(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ves")) return `${word.slice(0, -3)}f`;
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

function deriveCanonicalName(description: string): string {
  const clean = sanitize(description).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.includes("stevia")) return "stevia";

  const segments = clean.split(",").map((s) => s.trim()).filter(Boolean);
  const first = stripPlural(segments[0] || clean);
  const second = segments[1] ? sanitize(segments[1]) : "";

  if ((first === "beverage" || first === "beverages") && second) {
    return stripPlural(second.replace(/^and /, "").trim());
  }

  if ((first === "sugar" || first === "sweetener") && second.includes("stevia")) {
    return "stevia";
  }

  if (first === "sugar" && second.includes("granulated")) {
    return "sugar";
  }

  if (first === "yogurt" && second.includes("greek")) {
    return "greek yogurt";
  }

  return first;
}

function categoryFromText(categoryText: string): string {
  const t = sanitize(categoryText);
  if (!t) return "pantry";
  if (t.includes("dairy")) return "dairy";
  if (t.includes("beverages")) return "beverage";
  if (t.includes("fats") || t.includes("oils")) return "fat";
  if (t.includes("baked")) return "baking";
  if (t.includes("spices") || t.includes("herbs")) return "seasoning";
  if (t.includes("vegetables")) return "produce";
  if (t.includes("fruits")) return "produce";
  if (t.includes("legumes") || t.includes("beans")) return "protein";
  return "pantry";
}

function emptyNutAgg(): NutAgg {
  return {
    calories: { sum: 0, count: 0 },
    protein: { sum: 0, count: 0 },
    carbs: { sum: 0, count: 0 },
    fat: { sum: 0, count: 0 },
    sugar: { sum: 0, count: 0 },
    sodium: { sum: 0, count: 0 },
  };
}

function addNutrient(agg: NutAgg, nutrientId: string, amountRaw: string) {
  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount)) return;
  const key = (Object.keys(NUTRIENT_IDS) as NutKey[]).find((k) => NUTRIENT_IDS[k] === nutrientId);
  if (!key) return;
  agg[key].sum += amount;
  agg[key].count += 1;
}

function toAvgNutrition(agg: NutAgg) {
  const avg = (k: NutKey) => (agg[k].count > 0 ? agg[k].sum / agg[k].count : null);
  return {
    calories: avg("calories"),
    protein: avg("protein"),
    carbs: avg("carbs"),
    fat: avg("fat"),
    sugar: avg("sugar"),
    sodium: avg("sodium"),
  };
}

async function run() {
  if (!db || !pool) {
    throw new Error("Database connection unavailable for USDA import.");
  }
  console.log("Starting USDA import (Foundation + SR Legacy)...");

  const foundationIds = new Set<string>();
  const foundationSubToSample = new Map<string, string>();
  const categoryIdToName = new Map<string, string>();

  await parseCsv(path.join(FOUNDATION_BASE, "foundation_food.csv"), (row) => {
    if (row.fdc_id) foundationIds.add(row.fdc_id);
  });

  await parseCsv(path.join(FOUNDATION_BASE, "sub_sample_food.csv"), (row) => {
    if (row.fdc_id && row.fdc_id_of_sample_food) {
      foundationSubToSample.set(row.fdc_id, row.fdc_id_of_sample_food);
    }
  });

  await parseCsv(path.join(SR_BASE, "food_category.csv"), (row) => {
    if (row.id && row.description) categoryIdToName.set(row.id, row.description);
  });

  const targetInfo = new Map<string, { description: string; category: string }>();
  const nutrientTargetByFoodId = new Map<string, string>();

  await parseCsv(path.join(SR_BASE, "food.csv"), (row) => {
    const id = row.fdc_id;
    const dataType = sanitize(row.data_type || "");
    if (!id || !dataType) return;

    const category = categoryFromText(categoryIdToName.get(row.food_category_id) || "");
    const description = sanitize(row.description || "");

    if (dataType === "sr_legacy_food") {
      nutrientTargetByFoodId.set(id, id);
      if (!targetInfo.has(id)) {
        targetInfo.set(id, { description, category });
      }
      return;
    }

    if (foundationIds.has(id)) {
      nutrientTargetByFoodId.set(id, id);
      if (!targetInfo.has(id)) {
        targetInfo.set(id, { description, category });
      }
      return;
    }

    const sampleId = foundationSubToSample.get(id);
    if (sampleId) {
      nutrientTargetByFoodId.set(id, sampleId);
      if (!targetInfo.has(sampleId)) {
        targetInfo.set(sampleId, { description, category });
      }
    }
  });

  console.log(`Tracking ${targetInfo.size} USDA food targets for nutrition aggregation...`);

  const nutrientAggByTarget = new Map<string, NutAgg>();
  let nutrientRows = 0;

  await parseCsv(path.join(SR_BASE, "food_nutrient.csv"), (row) => {
    const targetId = nutrientTargetByFoodId.get(row.fdc_id);
    if (!targetId) return;
    nutrientRows += 1;
    if (nutrientRows % 200000 === 0) {
      console.log(`Processed ${nutrientRows} nutrient rows...`);
    }

    let agg = nutrientAggByTarget.get(targetId);
    if (!agg) {
      agg = emptyNutAgg();
      nutrientAggByTarget.set(targetId, agg);
    }
    addNutrient(agg, row.nutrient_id, row.amount);
  });

  const byCanonical = new Map<
    string,
    { canonicalName: string; category: string; members: number; nutrition: NutAgg }
  >();

  for (const [targetId, info] of targetInfo.entries()) {
    const canonical = deriveCanonicalName(info.description);
    if (!canonical) continue;

    const targetAgg = nutrientAggByTarget.get(targetId) ?? emptyNutAgg();
    const existing = byCanonical.get(canonical);

    if (!existing) {
      byCanonical.set(canonical, {
        canonicalName: info.description,
        category: info.category,
        members: 1,
        nutrition: targetAgg,
      });
      continue;
    }

    existing.members += 1;
    for (const k of Object.keys(existing.nutrition) as NutKey[]) {
      existing.nutrition[k].sum += targetAgg[k].sum;
      existing.nutrition[k].count += targetAgg[k].count;
    }
  }

  console.log(`Prepared ${byCanonical.size} canonical ingredients for upsert.`);

  let inserted = 0;
  const canonicalEntries = Array.from(byCanonical.entries());
  for (let i = 0; i < canonicalEntries.length; i++) {
    const [name, payload] = canonicalEntries[i];
    const [ingredient] = await db
      .insert(ingredientsTable)
      .values({
        name,
        canonicalName: payload.canonicalName,
        category: payload.category || "pantry",
      })
      .onConflictDoUpdate({
        target: ingredientsTable.name,
        set: {
          canonicalName: payload.canonicalName,
          category: payload.category || "pantry",
        },
      })
      .returning({ id: ingredientsTable.id });

    const nutrition = toAvgNutrition(payload.nutrition);
    const existingNut = await pool.query(
      "SELECT id FROM nutrition WHERE ingredient_id = $1 LIMIT 1",
      [ingredient.id]
    );

    if (existingNut.rows.length > 0) {
      await pool.query(
        `UPDATE nutrition
         SET calories = $1, protein = $2, carbs = $3, fat = $4, sugar = $5, sodium = $6
         WHERE ingredient_id = $7`,
        [
          nutrition.calories,
          nutrition.protein,
          nutrition.carbs,
          nutrition.fat,
          nutrition.sugar,
          nutrition.sodium,
          ingredient.id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO nutrition (ingredient_id, calories, protein, carbs, fat, sugar, sodium)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ingredient.id,
          nutrition.calories,
          nutrition.protein,
          nutrition.carbs,
          nutrition.fat,
          nutrition.sugar,
          nutrition.sodium,
        ]
      );
    }

    inserted += 1;
    if (i % 500 === 0) {
      console.log(`Upserted ${i} / ${canonicalEntries.length} ingredients...`);
    }
  }

  console.log(`USDA import complete. Upserted ${inserted} canonical ingredients.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("USDA import failed:", err);
  process.exit(1);
});
