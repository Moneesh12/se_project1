/**
 * Services barrel export.
 */
export { generateFallbackSubstitute, type AiSubstituteResult } from "./ai-engine";
export { normalizeIngredient, normalizeIngredientSync, invalidateAliasCache } from "./normalizer";
export {
  type NutritionRow,
  toVector,
  cosineSimilarity,
  healthImprovementScore,
  scoreSubstitute,
  findNutritionallySimilar,
} from "./ml-engine";
export {
  generateExplanation,
  generateNutritionalComparison,
  type ExplanationResult,
} from "./explanation-engine";
export { flavorSimilarity, getFlavorProfile, hasFlavorProfile } from "./flavor-engine";
export {
  analyzeRecipe,
  getSubstitutesForIngredient,
  parseIngredients,
  invalidateSubstitutionCaches,
  type ScoredSubstitute,
  type IngredientAnalysis,
  type RecipeAnalysisResult,
} from "./substitution-engine";

export {
  registerUser,
  loginUser,
  getUserById,
  verifyToken,
  saveFavoriteSubstitute,
  getFavoriteSubstitutes,
  removeFavoriteSubstitute,
  saveRecipe,
  getSavedRecipes,
  deleteSavedRecipe,
  addSubstitutionHistory,
  getSubstitutionHistory,
  type AuthUser,
  type AuthResult,
} from "./auth";
