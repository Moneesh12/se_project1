interface ProductData {
  additivesTags?: string[];
  ingredientsText?: string | null;
  novaGroup?: number | null;
  nutriscoreGrade?: string | null;
}

const NUTRI_SCORE_MAP: Record<string, number> = {
  a: 100, b: 80, c: 60, d: 30, e: 0,
};

export function computeCleanIngredientScore(product: ProductData): number {
  const hasAdditives = product.additivesTags !== undefined;
  const additiveCount = product.additivesTags?.length ?? 0;
  const additiveScore = hasAdditives
    ? Math.max(0, 100 - additiveCount * 10)
    : 20;

  const hasIngredients = !!product.ingredientsText && product.ingredientsText.length > 5;
  const ingredientListLen = product.ingredientsText
    ? product.ingredientsText.split(",").length
    : 0;
  const ingredientScore = hasIngredients
    ? Math.max(0, 100 - (ingredientListLen - 1) * 8)
    : 20;

  const nova = product.novaGroup;
  const hasNova = nova !== null && nova !== undefined && nova >= 1 && nova <= 4;
  const novaScore = hasNova ? 100 - (nova - 1) * 33 : 20;

  const nutriKey = product.nutriscoreGrade?.toLowerCase() ?? "";
  const nutriScore = nutriKey && NUTRI_SCORE_MAP[nutriKey] !== undefined
    ? NUTRI_SCORE_MAP[nutriKey]
    : 20;

  return Math.round(additiveScore * 0.3 + ingredientScore * 0.3 + novaScore * 0.25 + nutriScore * 0.15);
}
