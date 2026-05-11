/** VitalSub API – General-purpose ingredient substitution engine. */
import type { IngredientResult } from "./ingredientResult";
import type { NutritionData } from "./nutritionData";

export interface AnalyzeRecipeResponse {
  parsedIngredients: IngredientResult[];
  originalNutritionTotal: NutritionData;
  substitutedNutritionTotal: NutritionData;
  /** Number of ingredients that have at least one substitute recommendation */
  substituteCount: number;
}
