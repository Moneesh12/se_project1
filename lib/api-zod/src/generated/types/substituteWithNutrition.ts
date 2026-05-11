/** VitalSub API – General-purpose ingredient substitution engine. */
import type { NutritionData } from "./nutritionData";

export interface SubstituteWithNutrition {
  name: string;
  /** Composite score 0–100 (nutritional similarity + functional match + health improvement + feedback) */
  score: number;
  /** Why this substitute was recommended (e.g. "Verified direct substitution", "Functional match (Sweetener)") */
  reason?: string;
  nutrition?: NutritionData;
}
