import { Router, type IRouter } from "express";
import { db, ingredientsTable, nutritionTable, substitutionsTable, diseaseRulesTable, feedbackTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  AnalyzeRecipeBody,
  AnalyzeRecipeResponse,
  ListIngredientsResponse,
  GetSubstitutesParams,
  GetSubstitutesResponse,
  GetIngredientNutritionParams,
  GetIngredientNutritionResponse,
  ListDiseasesResponse,
  SubmitFeedbackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

/* Parse simple ingredient strings like "2 cups sugar, 1 tbsp salt" */
function parseIngredients(recipeText: string): string[] {
  const parts = recipeText.split(",").map((s) => s.trim()).filter(Boolean);
  const names: string[] = [];
  for (const part of parts) {
    // Remove leading quantities and units (numbers, fractions, words like cups/tbsp/tsp/oz/g/ml)
    const cleaned = part
      .replace(/^\d+[\d./]*\s*/g, "")
      .replace(/^(cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|gram|g|ml|pound|lb|liter|l|pinch|dash|handful|clove|cloves|slice|slices|piece|pieces)\s+/gi, "")
      .trim()
      .toLowerCase();
    if (cleaned) names.push(cleaned);
  }
  return names;
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

/* POST /analyze-recipe */
router.post("/analyze-recipe", async (req, res): Promise<void> => {
  const parsed = AnalyzeRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { recipe, disease } = parsed.data;
  const ingredientNames = parseIngredients(recipe);

  if (ingredientNames.length === 0) {
    res.status(400).json({ error: "Could not parse any ingredients from the recipe text." });
    return;
  }

  // Fetch all restricted ingredients for the disease
  const diseaseRules = await db
    .select()
    .from(diseaseRulesTable)
    .where(sql`lower(${diseaseRulesTable.diseaseName}) = lower(${disease})`);

  const restrictedSet = new Set(diseaseRules.map((r) => r.restrictedIngredient.toLowerCase()));

  const originalTotal = zeroNutrition();
  const substitutedTotal = zeroNutrition();

  const results = [];
  for (const name of ingredientNames) {
    const isUnsafe = restrictedSet.has(name);

    // Look up nutrition for original ingredient
    const [ingRow] = await db
      .select()
      .from(ingredientsTable)
      .where(sql`lower(${ingredientsTable.name}) = lower(${name})`);

    let originalNutrition = null;
    if (ingRow) {
      const [nutRow] = await db
        .select()
        .from(nutritionTable)
        .where(eq(nutritionTable.ingredientId, ingRow.id));
      if (nutRow) {
        originalNutrition = {
          calories: nutRow.calories,
          protein: nutRow.protein,
          carbs: nutRow.carbs,
          fat: nutRow.fat,
          sugar: nutRow.sugar,
          sodium: nutRow.sodium,
        };
        addNutrition(originalTotal, originalNutrition);
        Object.assign(originalTotal, addNutrition(originalTotal, originalNutrition));
      }
    }

    // Fetch substitutes
    const substitutionRows = await db
      .select()
      .from(substitutionsTable)
      .where(sql`lower(${substitutionsTable.originalIngredient}) = lower(${name})`);

    const substitutes = [];
    for (const subRow of substitutionRows) {
      const subName = subRow.substituteIngredient;
      const [subIng] = await db
        .select()
        .from(ingredientsTable)
        .where(sql`lower(${ingredientsTable.name}) = lower(${subName})`);

      let subNutrition = null;
      if (subIng) {
        const [subNut] = await db
          .select()
          .from(nutritionTable)
          .where(eq(nutritionTable.ingredientId, subIng.id));
        if (subNut) {
          subNutrition = {
            calories: subNut.calories,
            protein: subNut.protein,
            carbs: subNut.carbs,
            fat: subNut.fat,
            sugar: subNut.sugar,
            sodium: subNut.sodium,
          };
        }
      }

      // Score: lower sugar + lower calories = better (score formula)
      const score = 100 - ((subNutrition?.sugar ?? 0) + (subNutrition?.calories ?? 0) * 0.1);
      substitutes.push({ name: subName, score, nutrition: subNutrition });
    }

    // Sort substitutes by score descending
    substitutes.sort((a, b) => b.score - a.score);

    // For nutrition totals: if unsafe, use substitute nutrition; otherwise use original
    if (isUnsafe && substitutes.length > 0 && substitutes[0].nutrition) {
      Object.assign(substitutedTotal, addNutrition(substitutedTotal, substitutes[0].nutrition));
    } else if (originalNutrition) {
      Object.assign(substitutedTotal, addNutrition(substitutedTotal, originalNutrition));
    }

    results.push({
      name,
      isUnsafe,
      substitutes: isUnsafe ? substitutes : [],
      originalNutrition,
    });
  }

  const unsafeCount = results.filter((r) => r.isUnsafe).length;

  const response = AnalyzeRecipeResponse.parse({
    disease,
    parsedIngredients: results,
    originalNutritionTotal: originalTotal,
    substitutedNutritionTotal: substitutedTotal,
    unsafeCount,
  });

  res.json(response);
});

/* GET /ingredients */
router.get("/ingredients", async (_req, res): Promise<void> => {
  const rows = await db.select().from(ingredientsTable).orderBy(ingredientsTable.name);
  res.json(ListIngredientsResponse.parse(rows));
});

/* GET /ingredients/:name/substitutes */
router.get("/ingredients/:name/substitutes", async (req, res): Promise<void> => {
  const params = GetSubstitutesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { name } = params.data;
  const subs = await db
    .select()
    .from(substitutionsTable)
    .where(sql`lower(${substitutionsTable.originalIngredient}) = lower(${name})`);

  if (subs.length === 0) {
    res.json([]);
    return;
  }

  const result = [];
  for (const sub of subs) {
    const [ing] = await db
      .select()
      .from(ingredientsTable)
      .where(sql`lower(${ingredientsTable.name}) = lower(${sub.substituteIngredient})`);

    let nut = null;
    if (ing) {
      const [nutRow] = await db.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, ing.id));
      if (nutRow) nut = { calories: nutRow.calories, protein: nutRow.protein, carbs: nutRow.carbs, fat: nutRow.fat, sugar: nutRow.sugar, sodium: nutRow.sodium };
    }
    const score = 100 - ((nut?.sugar ?? 0) + (nut?.calories ?? 0) * 0.1);
    result.push({ name: sub.substituteIngredient, score, nutrition: nut });
  }

  result.sort((a, b) => b.score - a.score);
  res.json(GetSubstitutesResponse.parse(result));
});

/* GET /ingredients/:name/nutrition */
router.get("/ingredients/:name/nutrition", async (req, res): Promise<void> => {
  const params = GetIngredientNutritionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { name } = params.data;
  const [ing] = await db
    .select()
    .from(ingredientsTable)
    .where(sql`lower(${ingredientsTable.name}) = lower(${name})`);

  if (!ing) {
    res.status(404).json({ error: "Ingredient not found" });
    return;
  }

  const [nut] = await db.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, ing.id));
  if (!nut) {
    res.status(404).json({ error: "Nutrition data not found" });
    return;
  }

  res.json(GetIngredientNutritionResponse.parse({
    calories: nut.calories,
    protein: nut.protein,
    carbs: nut.carbs,
    fat: nut.fat,
    sugar: nut.sugar,
    sodium: nut.sodium,
  }));
});

/* GET /diseases */
router.get("/diseases", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ name: diseaseRulesTable.diseaseName })
    .from(diseaseRulesTable)
    .orderBy(diseaseRulesTable.diseaseName);
  const names = rows.map((r) => r.name);
  res.json(ListDiseasesResponse.parse(names));
});

/* POST /feedback */
router.post("/feedback", async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(feedbackTable)
    .values({
      ingredient: parsed.data.ingredient,
      substitute: parsed.data.substitute,
      rating: parsed.data.rating,
    })
    .returning();

  res.status(201).json({ id: row.id, message: "Thank you for your feedback!" });
});

export default router;
