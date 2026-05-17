import { computeCleanIngredientScore } from "./cleanIngredientScore";

export interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  image_url?: string;
  url?: string;
  ingredients_text?: string | null;
  additives_tags?: string[];
  additives_n?: number;
  nova_group?: number;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  product_quantity?: number;
  product_quantity_unit?: string;
  categories_tags?: string[];
  labels_tags?: string[];
  ecoscore_score?: number;
  ecoscore_grade?: string;
  [key: string]: unknown;
}

export interface RankedProduct {
  productName: string;
  brand: string;
  imageUrl: string | null;
  url: string | null;
  cleanScore: number;
  ingredientsList: string | null;
  additiveCount: number;
  novaGroup: number | null;
  nutriscoreGrade: string | null;
  reason: string;
}

function generateReasons(product: OpenFoodFactsProduct): string {
  const reasons: string[] = [];
  const additiveCount = product.additives_tags?.length ?? 0;
  const ingredientLen = product.ingredients_text
    ? product.ingredients_text.split(",").length
    : 0;
  const nova = product.nova_group;

  if (additiveCount === 0) reasons.push("No additives detected");
  else if (additiveCount <= 2) reasons.push(`Only ${additiveCount} additive${additiveCount > 1 ? "s" : ""}`);
  else reasons.push(`${additiveCount} additives`);

  if (ingredientLen > 0) {
    if (ingredientLen <= 3) reasons.push(`Only ${ingredientLen} ingredients`);
    else reasons.push(`${ingredientLen} ingredients total`);
  }

  if (nova === 1) reasons.push("Minimally processed");
  else if (nova === 2) reasons.push("Low processing");
  else if (nova === 4) reasons.push("Ultra-processed");

  const grade = product.nutriscore_grade?.toLowerCase();
  if (grade === "a" || grade === "b") reasons.push(`Nutri-Score ${grade.toUpperCase()}`);

  return reasons.join(" · ");
}

export function rankBrands(products: OpenFoodFactsProduct[]): {
  bestOverall: RankedProduct | null;
  cleanest: RankedProduct | null;
  budget: RankedProduct | null;
} {
  if (!products.length) return { bestOverall: null, cleanest: null, budget: null };

  const scored = products.map((p) => ({
    product: p,
    score: computeCleanIngredientScore({
      additivesTags: p.additives_tags,
      ingredientsText: p.ingredients_text,
      novaGroup: p.nova_group,
      nutriscoreGrade: p.nutriscore_grade,
    }),
  }));

  scored.sort((a, b) => b.score - a.score);

  const toRanked = (p: OpenFoodFactsProduct): RankedProduct => ({
    productName: p.product_name || "Unknown Product",
    brand: p.brands || "Unknown brand",
    imageUrl: p.image_url || null,
    url: p.url || null,
    cleanScore: computeCleanIngredientScore({
      additivesTags: p.additives_tags,
      ingredientsText: p.ingredients_text,
      novaGroup: p.nova_group,
      nutriscoreGrade: p.nutriscore_grade,
    }),
    ingredientsList: p.ingredients_text || null,
    additiveCount: p.additives_tags?.length ?? 0,
    novaGroup: p.nova_group ?? null,
    nutriscoreGrade: p.nutriscore_grade ?? null,
    reason: generateReasons(p),
  });

  const bestOverall = scored[0] ? toRanked(scored[0].product) : null;

  const sortedByAdditives = [...scored].sort(
    (a, b) => (a.product.additives_tags?.length ?? 999) - (b.product.additives_tags?.length ?? 999)
  );
  const cleanest = sortedByAdditives[0]
    ? toRanked(sortedByAdditives[0].product)
    : null;

  const budget = scored.length >= 2
    ? toRanked(scored[1].product)
    : null;

  return { bestOverall, cleanest, budget };
}
