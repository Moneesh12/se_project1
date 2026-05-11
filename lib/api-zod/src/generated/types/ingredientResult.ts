/** VitalSub API – General-purpose ingredient substitution engine. */
import type { NutritionData } from "./nutritionData";
import type { SubstituteWithNutrition } from "./substituteWithNutrition";

export interface IngredientResult {
  name: string;
  /** Canonical form if the input was a recognized variant (e.g. "brown sugar" → "sugar") */
  normalizedName?: string;
  hasSubstitutes: boolean;
  substitutes: SubstituteWithNutrition[];
  originalNutrition?: NutritionData;
}
