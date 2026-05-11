import { Router, type IRouter } from "express";
import { db, ingredientsTable, nutritionTable, substitutionsTable, feedbackTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  AnalyzeRecipeBody,
  AnalyzeRecipeResponse,
  ListIngredientsResponse,
  GetSubstitutesParams,
  GetSubstitutesResponse,
  GetIngredientNutritionParams,
  GetIngredientNutritionResponse,
  SubmitFeedbackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── STEP 1: INGREDIENT NORMALIZATION MAP ────────────────────────────────────
const NORMALIZATION_MAP: Record<string, string> = {
  "brown sugar": "sugar", "white sugar": "sugar", "granulated sugar": "sugar",
  "caster sugar": "sugar", "powdered sugar": "sugar", "confectioners sugar": "sugar",
  "raw sugar": "sugar", "demerara sugar": "sugar",
  "low-fat milk": "milk", "skim milk": "milk", "whole milk": "milk",
  "2% milk": "milk", "nonfat milk": "milk", "fat-free milk": "milk",
  "reduced fat milk": "milk", "semi-skimmed milk": "milk",
  "all-purpose flour": "flour", "whole wheat flour": "flour", "bread flour": "flour",
  "cake flour": "flour", "self-rising flour": "flour", "plain flour": "flour",
  "unsalted butter": "butter", "salted butter": "butter",
  "softened butter": "butter", "melted butter": "butter",
  "vegetable oil": "oil", "canola oil": "oil", "sunflower oil": "oil", "corn oil": "oil",
  "sea salt": "salt", "kosher salt": "salt", "table salt": "salt",
  "himalayan salt": "salt", "rock salt": "salt",
  "heavy cream": "cream", "double cream": "cream", "whipping cream": "cream",
  "greek yogurt": "yogurt", "plain yogurt": "yogurt", "natural yogurt": "yogurt",
  "dark chocolate": "chocolate", "milk chocolate": "chocolate", "white chocolate": "chocolate",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function requireDb(res: import("express").Response): boolean {
  if (!db) {
    res.status(503).json({
      error: "Database is currently unavailable. Please ensure DATABASE_URL is configured.",
    });
    return false;
  }
  return true;
}

function parseIngredients(recipeText: string): string[] {
  const parts = recipeText.split(",").map((s) => s.trim()).filter(Boolean);
  const names: string[] = [];
  for (const part of parts) {
    const cleaned = part
      .replace(/^\d+[\d./]*\s*/g, "")
      .replace(/^(cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|gram|g|ml|pound|lb|liter|l|pinch|dash|handful|clove|cloves|slice|slices|piece|pieces)\s+/gi, "")
      .trim()
      .toLowerCase();
    if (cleaned) names.push(cleaned);
  }
  return names;
}

function normalizeIngredient(name: string): string {
  const lower = name.toLowerCase().trim();
  return NORMALIZATION_MAP[lower] ?? lower;
}

function zeroNutrition() {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };
}

function addNutrition(
  a: { calories: number; protein: number; carbs: number; fat: number; sugar: number; sodium: number },
  b: { calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; sugar?: number | null; sodium?: number | null }
) {
  return {
    calories: a.calories + (b.calories ?? 0),
    protein: a.protein + (b.protein ?? 0),
    carbs: a.carbs + (b.carbs ?? 0),
    fat: a.fat + (b.fat ?? 0),
    sugar: a.sugar + (b.sugar ?? 0),
    sodium: a.sodium + (b.sodium ?? 0),
  };
}

// ─── STEP 3: SCORING ENGINE ──────────────────────────────────────────────────

type NutritionRow = {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  sugar?: number | null;
  sodium?: number | null;
};

/** Convert nutrition to a 6-dimensional vector. Sodium is scaled down. */
function toVector(nut: NutritionRow): number[] {
  return [
    nut.calories ?? 0,
    nut.protein ?? 0,
    nut.carbs ?? 0,
    nut.fat ?? 0,
    nut.sugar ?? 0,
    (nut.sodium ?? 0) / 100, // scale sodium
  ];
}

/** Cosine similarity [0, 1] between two nutrition vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 && magB === 0) return 1; // both zero vectors = identical
  if (magA === 0 || magB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (magA * magB)));
}

/** General health improvement: rewards lower sugar/sodium/calories, higher protein */
function healthImprovementScore(orig: NutritionRow, sub: NutritionRow): number {
  let score = 0.5;
  const calDiff  = (orig.calories ?? 0) - (sub.calories ?? 0);
  const sugarDiff = (orig.sugar ?? 0) - (sub.sugar ?? 0);
  const sodiumDiff = (orig.sodium ?? 0) - (sub.sodium ?? 0);
  const proteinDiff = (sub.protein ?? 0) - (orig.protein ?? 0);
  score += Math.tanh(calDiff / 100)   * 0.10;
  score += Math.tanh(sugarDiff / 10)  * 0.20;
  score += Math.tanh(sodiumDiff / 500) * 0.10;
  score += Math.tanh(proteinDiff / 5) * 0.10;
  return Math.max(0, Math.min(1, score));
}

/**
 * Composite score (0–100):
 *   40% nutritional similarity (cosine)
 *   30% functional/category similarity
 *   20% general health improvement
 *   10% user feedback rating
 *   +5% bonus for verified direct mapping
 */
function scoreSubstitute(
  origNut: NutritionRow,
  subNut: NutritionRow,
  origRole: string | null | undefined,
  subRole: string | null | undefined,
  origCategory: string,
  subCategory: string,
  feedbackRating: number | null,
  isDirect: boolean
): number {
  const nutSim = cosineSimilarity(toVector(origNut), toVector(subNut));

  let funcSim = 0;
  if (origRole && subRole && origRole === subRole) funcSim = 1.0;
  else if (origCategory === subCategory) funcSim = 0.5;
  else if (origRole && subRole) funcSim = 0.1; // at least both have a role

  const healthSim = healthImprovementScore(origNut, subNut);
  const fbScore = feedbackRating !== null ? feedbackRating / 5 : 0.5;
  const directBonus = isDirect ? 0.05 : 0;

  const raw = 0.40 * nutSim + 0.30 * funcSim + 0.20 * healthSim + 0.10 * fbScore + directBonus;
  return Math.round(Math.min(100, raw * 100));
}

async function getFeedbackRating(ingredient: string, substitute: string): Promise<number | null> {
  try {
    const rows = await db!
      .select({ avgRating: sql<number>`AVG(${feedbackTable.rating})` })
      .from(feedbackTable)
      .where(sql`lower(${feedbackTable.ingredient}) = lower(${ingredient}) AND lower(${feedbackTable.substitute}) = lower(${substitute})`);
    const val = rows[0]?.avgRating;
    return val !== null && val !== undefined ? Number(val) : null;
  } catch {
    return null;
  }
}

interface ScoredSubstitute {
  name: string;
  score: number;
  reason: string;
  nutrition: NutritionRow;
}

// ─── STEP 2: CANDIDATE GENERATION + PIPELINE ─────────────────────────────────

/**
 * 3-layer substitution pipeline:
 *   Layer 1 – Direct DB mappings
 *   Layer 2 – Functional role / category matches
 *   Layer 3 – Cosine nutrition similarity (threshold ≥ 0.70)
 *
 * Fallback guarantee: always returns at least one generic suggestion.
 */
async function findSubstitutes(
  origName: string,
  origIngRow: typeof ingredientsTable.$inferSelect | null,
  origNut: NutritionRow | null
): Promise<ScoredSubstitute[]> {
  const candidates = new Map<string, { reason: string; isDirect: boolean }>();

  // LAYER 1 ─ Direct substitutions
  try {
    const directRows = await db!
      .select()
      .from(substitutionsTable)
      .where(sql`lower(${substitutionsTable.originalIngredient}) = lower(${origName})`);
    for (const row of directRows) {
      const key = row.substituteIngredient.toLowerCase();
      if (key !== origName.toLowerCase()) {
        candidates.set(key, { reason: "Verified direct substitution", isDirect: true });
      }
    }
  } catch (err) {
    console.error("DB ERROR (layer1 direct):", err);
  }

  // LAYER 2 ─ Functional role match, then category fallback
  if (origIngRow) {
    try {
      if (origIngRow.functionalRole) {
        const funcRows = await db!
          .select()
          .from(ingredientsTable)
          .where(sql`${ingredientsTable.functionalRole} = ${origIngRow.functionalRole} AND lower(${ingredientsTable.name}) != lower(${origName})`);
        for (const row of funcRows) {
          const key = row.name.toLowerCase();
          if (!candidates.has(key))
            candidates.set(key, { reason: `Functional match (${origIngRow.functionalRole})`, isDirect: false });
        }
      }

      if (candidates.size < 3) {
        const catRows = await db!
          .select()
          .from(ingredientsTable)
          .where(sql`${ingredientsTable.category} = ${origIngRow.category} AND lower(${ingredientsTable.name}) != lower(${origName})`);
        for (const row of catRows) {
          const key = row.name.toLowerCase();
          if (!candidates.has(key))
            candidates.set(key, { reason: `Category match (${origIngRow.category})`, isDirect: false });
        }
      }
    } catch (err) {
      console.error("DB ERROR (layer2 functional):", err);
    }
  }

  // LAYER 3 ─ Cosine nutrition similarity
  if (origNut && candidates.size < 5) {
    try {
      const allRows = await db!
        .select({
          name: ingredientsTable.name,
          category: ingredientsTable.category,
          functionalRole: ingredientsTable.functionalRole,
          calories: nutritionTable.calories,
          protein: nutritionTable.protein,
          carbs: nutritionTable.carbs,
          fat: nutritionTable.fat,
          sugar: nutritionTable.sugar,
          sodium: nutritionTable.sodium,
        })
        .from(nutritionTable)
        .innerJoin(ingredientsTable, eq(nutritionTable.ingredientId, ingredientsTable.id))
        .where(sql`lower(${ingredientsTable.name}) != lower(${origName})`);

      const origVec = toVector(origNut);
      const topSim = allRows
        .map((row) => ({ row, sim: cosineSimilarity(origVec, toVector(row)) }))
        .filter(({ sim }) => sim >= 0.70)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 3);

      for (const { row } of topSim) {
        const key = row.name.toLowerCase();
        if (!candidates.has(key))
          candidates.set(key, { reason: "Nutritionally similar ingredient", isDirect: false });
      }
    } catch (err) {
      console.error("DB ERROR (layer3 cosine):", err);
    }
  }

  // SCORE all candidates
  const scored: ScoredSubstitute[] = [];
  for (const [key, { reason, isDirect }] of candidates.entries()) {
    try {
      const subIngRows = await db!.select().from(ingredientsTable).where(sql`lower(${ingredientsTable.name}) = lower(${key})`);
      const subIng = subIngRows[0] ?? null;
      if (!subIng) continue;

      const subNutRows = await db!.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, subIng.id));
      const subNutRow = subNutRows[0] ?? null;
      const subNut: NutritionRow = subNutRow
        ? { calories: subNutRow.calories, protein: subNutRow.protein, carbs: subNutRow.carbs, fat: subNutRow.fat, sugar: subNutRow.sugar, sodium: subNutRow.sodium }
        : {};

      const fbRating = await getFeedbackRating(origName, subIng.name);
      const score = scoreSubstitute(
        origNut ?? {}, subNut,
        origIngRow?.functionalRole, subIng.functionalRole,
        origIngRow?.category ?? "", subIng.category,
        fbRating, isDirect
      );

      scored.push({ name: subIng.name, score, reason, nutrition: subNut });
    } catch (err) {
      console.error(`DB ERROR (scoring ${key}):`, err);
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // FALLBACK GUARANTEE — never return empty
  if (scored.length === 0) {
    const label = origIngRow?.functionalRole ?? origIngRow?.category ?? "similar";
    scored.push({
      name: `Any ${label} alternative`,
      score: 50,
      reason: `No specific substitute found. Use any ${label} ingredient that fits your recipe.`,
      nutrition: {},
    });
  }

  return scored;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

/** POST /analyze-recipe */
router.post("/analyze-recipe", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;

    const parsed = AnalyzeRecipeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { recipe } = parsed.data;
    const rawIngredients = parseIngredients(recipe);
    if (rawIngredients.length === 0) {
      res.status(400).json({ error: "Could not parse any ingredients from the recipe text." });
      return;
    }

    // Normalize all ingredient names (Step 1)
    const normalizedIngredients = rawIngredients.map(normalizeIngredient);

    let originalTotal = zeroNutrition();
    let substitutedTotal = zeroNutrition();
    const results = [];

    for (let i = 0; i < normalizedIngredients.length; i++) {
      const name = normalizedIngredients[i];
      const rawName = rawIngredients[i];

      // Lookup ingredient row
      let ingRow: typeof ingredientsTable.$inferSelect | null = null;
      try {
        const rows = await db!.select().from(ingredientsTable).where(sql`lower(${ingredientsTable.name}) = lower(${name})`);
        ingRow = rows[0] ?? null;
      } catch (err) {
        console.error(`DB ERROR (ingredient lookup: ${name}):`, err);
      }

      // Lookup original nutrition
      let origNut: NutritionRow | null = null;
      if (ingRow) {
        try {
          const nutRows = await db!.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, ingRow.id));
          const nutRow = nutRows[0] ?? null;
          if (nutRow) {
            origNut = { calories: nutRow.calories, protein: nutRow.protein, carbs: nutRow.carbs, fat: nutRow.fat, sugar: nutRow.sugar, sodium: nutRow.sodium };
            originalTotal = addNutrition(originalTotal, origNut);
          }
        } catch (err) {
          console.error(`DB ERROR (nutrition lookup: ${name}):`, err);
        }
      }

      // Run 3-layer substitution pipeline (Steps 2 & 3)
      const substitutes = await findSubstitutes(name, ingRow, origNut);
      const hasSubstitutes = substitutes.length > 0;

      // Use best substitute nutrition for substituted total
      const bestSubNut = substitutes[0]?.nutrition;
      if (hasSubstitutes && bestSubNut && Object.keys(bestSubNut).length > 0) {
        substitutedTotal = addNutrition(substitutedTotal, bestSubNut);
      } else if (origNut) {
        substitutedTotal = addNutrition(substitutedTotal, origNut);
      }

      results.push({
        name: rawName,
        normalizedName: name !== rawName ? name : undefined,
        hasSubstitutes,
        substitutes,
        originalNutrition: origNut,
      });
    }

    res.json(AnalyzeRecipeResponse.parse({
      parsedIngredients: results,
      originalNutritionTotal: originalTotal,
      substitutedNutritionTotal: substitutedTotal,
      substituteCount: results.filter((r) => r.hasSubstitutes).length,
    }));
  } catch (err) {
    console.error("ANALYSIS ERROR:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/** GET /ingredients */
router.get("/ingredients", async (_req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const rows = await db!.select().from(ingredientsTable).orderBy(ingredientsTable.name);
    res.json(ListIngredientsResponse.parse(rows));
  } catch (err) {
    console.error("GET /ingredients ERROR:", err);
    res.status(500).json({ error: "Failed to fetch ingredients" });
  }
});

/** GET /ingredients/:name/substitutes */
router.get("/ingredients/:name/substitutes", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const params = GetSubstitutesParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const { name } = params.data;
    const normalizedName = normalizeIngredient(name);

    const ingRows = await db!.select().from(ingredientsTable).where(sql`lower(${ingredientsTable.name}) = lower(${normalizedName})`);
    const ingRow = ingRows[0] ?? null;

    let origNut: NutritionRow | null = null;
    if (ingRow) {
      const nutRows = await db!.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, ingRow.id));
      const nutRow = nutRows[0] ?? null;
      if (nutRow) origNut = { calories: nutRow.calories, protein: nutRow.protein, carbs: nutRow.carbs, fat: nutRow.fat, sugar: nutRow.sugar, sodium: nutRow.sodium };
    }

    const substitutes = await findSubstitutes(normalizedName, ingRow, origNut);
    res.json(GetSubstitutesResponse.parse(substitutes));
  } catch (err) {
    console.error("GET /ingredients/:name/substitutes ERROR:", err);
    res.status(500).json({ error: "Failed to fetch substitutes" });
  }
});

/** GET /ingredients/:name/nutrition */
router.get("/ingredients/:name/nutrition", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const params = GetIngredientNutritionParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const { name } = params.data;
    const normalizedName = normalizeIngredient(name);
    const ingRows = await db!.select().from(ingredientsTable).where(sql`lower(${ingredientsTable.name}) = lower(${normalizedName})`);
    const ing = ingRows[0] ?? null;
    if (!ing) { res.status(404).json({ error: "Ingredient not found" }); return; }

    const nutRows = await db!.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, ing.id));
    const nut = nutRows[0] ?? null;
    if (!nut) { res.status(404).json({ error: "Nutrition data not found" }); return; }

    res.json(GetIngredientNutritionResponse.parse({
      calories: nut.calories, protein: nut.protein, carbs: nut.carbs,
      fat: nut.fat, sugar: nut.sugar, sodium: nut.sodium,
    }));
  } catch (err) {
    console.error("GET /ingredients/:name/nutrition ERROR:", err);
    res.status(500).json({ error: "Failed to fetch nutrition data" });
  }
});

/** POST /feedback */
router.post("/feedback", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const parsed = SubmitFeedbackBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const { ingredient, substitute, rating } = parsed.data;
    const [inserted] = await db!
      .insert(feedbackTable)
      .values({ ingredient, substitute, rating })
      .returning({ id: feedbackTable.id });

    res.json({ id: inserted.id, message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("POST /feedback ERROR:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;