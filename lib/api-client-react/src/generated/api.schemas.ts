/**
 * VitalSub API – TypeScript schemas
 * General-purpose intelligent ingredient substitution engine.
 */

export interface HealthStatus {
  status: string;
}

export interface ErrorResponse {
  error: string;
}

/** POST /analyze-recipe request */
export interface AnalyzeRecipeRequest {
  /** Comma-separated ingredient list, e.g. "2 cups brown sugar, 1 cup milk" */
  recipe: string;
}

export interface NutritionData {
  /** @nullable */
  calories?: number | null;
  /** @nullable */
  protein?: number | null;
  /** @nullable */
  carbs?: number | null;
  /** @nullable */
  fat?: number | null;
  /** @nullable */
  sugar?: number | null;
  /** @nullable */
  sodium?: number | null;
}

export interface SubstituteWithNutrition {
  name: string;
  /** Composite score 0–100 */
  score: number;
  /** Why this substitute was recommended */
  reason?: string;
  nutrition?: NutritionData;
}

export interface IngredientResult {
  name: string;
  /** Canonical form if the input was a recognized variant (e.g. "brown sugar" → "sugar") */
  normalizedName?: string;
  hasSubstitutes: boolean;
  substitutes: SubstituteWithNutrition[];
  originalNutrition?: NutritionData;
}

export interface AnalyzeRecipeResponse {
  parsedIngredients: IngredientResult[];
  originalNutritionTotal: NutritionData;
  substitutedNutritionTotal: NutritionData;
  /** Number of ingredients that have at least one substitute recommendation */
  substituteCount: number;
}

export interface Ingredient {
  id: number;
  name: string;
  category: string;
}

export interface FeedbackRequest {
  ingredient: string;
  substitute: string;
  /** Rating from 1 (poor) to 5 (excellent) */
  rating: number;
}

export interface FeedbackResponse {
  id: number;
  message: string;
}
