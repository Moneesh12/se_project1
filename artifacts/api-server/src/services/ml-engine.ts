/**
 * ML Engine — Cosine Similarity & Nutritional Scoring
 * ─────────────────────────────────────────────────────
 * Provides vector-based comparison for nutrition profiles
 * and scoring functions for substitute ranking.
 *
 * Nutrition vector: [calories, sugar, sodium, protein, fat, carbs]
 *
 * Uses cosine similarity:  cos(A,B) = (A·B) / (|A| × |B|)
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface NutritionVector {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
}

export type NutritionRow = {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  sugar?: number | null;
  sodium?: number | null;
};

// ─── VECTOR OPERATIONS ──────────────────────────────────────────────────────

/**
 * Convert a NutritionRow into a 6-dimensional vector.
 * Sodium is scaled down by 100× to prevent it from dominating the similarity.
 */
export function toVector(nut: NutritionRow): number[] {
  return [
    nut.calories ?? 0,
    nut.sugar ?? 0,
    (nut.sodium ?? 0) / 100,   // scale sodium to comparable range
    nut.protein ?? 0,
    nut.fat ?? 0,
    nut.carbs ?? 0,
  ];
}

/**
 * Cosine similarity ∈ [0, 1] between two nutrition vectors.
 * Returns 1 for identical profiles, 0 for orthogonal.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 && magB === 0) return 1; // both zero vectors = identical
  if (magA === 0 || magB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (magA * magB)));
}

/**
 * Euclidean distance between two nutrition vectors (lower = more similar).
 */
export function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

// ─── HEALTH IMPROVEMENT SCORING ─────────────────────────────────────────────

/**
 * Compute a health improvement score ∈ [0, 1] comparing original → substitute.
 * Rewards: lower sugar, lower sodium, lower calories, higher protein.
 * Uses tanh for smooth saturation.
 */
export function healthImprovementScore(orig: NutritionRow, sub: NutritionRow): number {
  let score = 0.5; // neutral baseline

  const calDiff    = (orig.calories ?? 0) - (sub.calories ?? 0);
  const sugarDiff  = (orig.sugar ?? 0) - (sub.sugar ?? 0);
  const sodiumDiff = (orig.sodium ?? 0) - (sub.sodium ?? 0);
  const proteinGain = (sub.protein ?? 0) - (orig.protein ?? 0);
  const fatDiff    = (orig.fat ?? 0) - (sub.fat ?? 0);

  // Each dimension contributes a bounded delta
  score += Math.tanh(calDiff / 100)    * 0.12;
  score += Math.tanh(sugarDiff / 10)   * 0.18;
  score += Math.tanh(sodiumDiff / 500)  * 0.08;
  score += Math.tanh(proteinGain / 5)  * 0.07;
  score += Math.tanh(fatDiff / 20)     * 0.05;

  return Math.max(0, Math.min(1, score));
}

// ─── FUNCTIONAL ROLE SIMILARITY ─────────────────────────────────────────────

/**
 * Score how well two ingredients match functionally.
 * Returns ∈ [0, 1].
 */
export function functionalSimilarity(
  origRole: string | null | undefined,
  subRole: string | null | undefined,
  origCategory: string,
  subCategory: string,
): number {
  if (origRole && subRole && origRole.toLowerCase() === subRole.toLowerCase()) return 1.0;
  if (origCategory === subCategory) return 0.5;
  if (origRole && subRole) return 0.1; // both have roles but different
  return 0;
}

// ─── COMPOSITE SCORING ──────────────────────────────────────────────────────

/**
 * Composite score (0–100) combining:
 *   35% nutritional improvement (health gain)
 *   35% nutritional similarity (cosine)
 *   10% flavor profile similarity
 *   20% user feedback rating
 *   +5  bonus for verified direct mapping
 *   +3  bonus for same functional role
 *   +3  bonus for shared flavor profile
 */
export function scoreSubstitute(params: {
  origNut: NutritionRow;
  subNut: NutritionRow;
  origRole: string | null | undefined;
  subRole: string | null | undefined;
  origCategory: string;
  subCategory: string;
  feedbackRating: number | null;
  isDirect: boolean;
  confidence?: number;
  flavorSimilarity?: number;
}): number {
  const {
    origNut, subNut, origRole, subRole,
    origCategory, subCategory, feedbackRating,
    isDirect, confidence,
    flavorSimilarity = 0,
  } = params;

  const nutSim   = cosineSimilarity(toVector(origNut), toVector(subNut));
  const funcSim  = functionalSimilarity(origRole, subRole, origCategory, subCategory);
  const healthSc = healthImprovementScore(origNut, subNut);
  const fbScore  = feedbackRating !== null ? feedbackRating / 5 : 0.5;

  // Weighted combination (35/35/10/20)
  let raw = 0.35 * healthSc + 0.35 * nutSim + 0.10 * flavorSimilarity + 0.20 * fbScore;

  // Bonuses
  if (isDirect) raw += 0.05;
  if (funcSim >= 1.0) raw += 0.03;
  if (flavorSimilarity >= 0.5) raw += 0.03;

  // Confidence multiplier from dataset
  if (confidence !== undefined && confidence > 0) {
    raw *= (0.8 + 0.2 * confidence);
  }

  return Math.round(Math.min(100, raw * 100));
}

// ─── BATCH SIMILARITY SEARCH ────────────────────────────────────────────────

interface IngredientWithNutrition {
  name: string;
  category: string;
  functionalRole: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sugar: number | null;
  sodium: number | null;
}

/**
 * Find top N nutritionally similar ingredients from a pre-loaded array.
 * Uses cosine similarity with a minimum threshold.
 */
export function findNutritionallySimilar(
  origNut: NutritionRow,
  candidates: IngredientWithNutrition[],
  origName: string,
  threshold: number = 0.70,
  topN: number = 5,
): { item: IngredientWithNutrition; similarity: number }[] {
  const origVec = toVector(origNut);

  return candidates
    .filter((c) => c.name.toLowerCase() !== origName.toLowerCase())
    .map((item) => ({
      item,
      similarity: cosineSimilarity(origVec, toVector(item)),
    }))
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
