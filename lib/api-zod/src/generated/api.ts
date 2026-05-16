/**
 * Ingredient Substitution API – Zod Schemas
 * General-purpose intelligent substitution engine.
 */
import * as zod from "zod";

// ─── Health ───────────────────────────────────────────────────────────────────
export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

// ─── Analyze Recipe ───────────────────────────────────────────────────────────

/** POST /analyze-recipe request body */
export const AnalyzeRecipeBody = zod.object({
  recipe: zod.string().describe('Recipe text, e.g. "2 cups brown sugar, 1 cup milk, 1 tbsp salt"'),
});

/** Shared nutrition object */
const NutritionData = zod.object({
  calories: zod.number().nullish(),
  protein:  zod.number().nullish(),
  carbs:    zod.number().nullish(),
  fat:      zod.number().nullish(),
  sugar:    zod.number().nullish(),
  sodium:   zod.number().nullish(),
});

/** Comparison highlights for a single ingredient pair */
const ComparisonHighlights = zod.object({
  original: zod.object({
    name: zod.string(),
    highlights: zod.array(zod.string()),
  }),
  substitute: zod.object({
    name: zod.string(),
    highlights: zod.array(zod.string()),
  }),
  improvementSummary: zod.string(),
}).optional();

/** Single substitute candidate */
const SubstituteItem = zod.object({
  name:      zod.string(),
  score:     zod.number().describe("Composite score 0–100"),
  reason:    zod.string().optional().describe("Why this substitute was recommended"),
  explanation: zod.string().optional().describe("Detailed explanation of the recommendation"),
  improvements: zod.array(zod.string()).optional().describe("List of key nutritional improvements"),
  nutrition: NutritionData.optional(),
  comparisonHighlights: ComparisonHighlights,
});

/** Per-ingredient result */
const IngredientResult = zod.object({
  name:            zod.string(),
  normalizedName:  zod.string().optional().describe("Canonical form if input was a variant"),
  hasSubstitutes:  zod.boolean(),
  substitutes:     zod.array(SubstituteItem),
  originalNutrition: NutritionData.optional(),
});

/** POST /analyze-recipe response */
export const AnalyzeRecipeResponse = zod.object({
  parsedIngredients:        zod.array(IngredientResult),
  originalNutritionTotal:   NutritionData,
  substitutedNutritionTotal: NutritionData,
  substituteCount:          zod.number().describe("Number of ingredients with recommended substitutes"),
});

// ─── Ingredients ──────────────────────────────────────────────────────────────

export const ListIngredientsResponseItem = zod.object({
  id:       zod.number(),
  name:     zod.string(),
  category: zod.string(),
});
export const ListIngredientsResponse = zod.array(ListIngredientsResponseItem);

export const GetSubstitutesParams = zod.object({ name: zod.coerce.string() });

export const GetSubstitutesResponseItem = zod.object({
  name:      zod.string(),
  score:     zod.number(),
  reason:    zod.string().optional(),
  explanation: zod.string().optional(),
  improvements: zod.array(zod.string()).optional(),
  nutrition: NutritionData.optional(),
  comparisonHighlights: ComparisonHighlights,
});
export const GetSubstitutesResponse = zod.array(GetSubstitutesResponseItem);

export const GetIngredientNutritionParams = zod.object({ name: zod.coerce.string() });
export const GetIngredientNutritionResponse = NutritionData;

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const SubmitFeedbackBody = zod.object({
  ingredient: zod.string(),
  substitute: zod.string(),
  rating:     zod.number().int().min(1).max(5).describe("Rating from 1 to 5"),
});
