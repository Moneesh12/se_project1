import {
  db,
  ingredientsTable,
  nutritionTable,
  substitutionsTable,
  feedbackTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { normalizeIngredient } from "./normalizer";
import {
  type NutritionRow,
  scoreSubstitute,
  healthImprovementScore,
} from "./ml-engine";
import {
  generateExplanation,
  generateNutritionalComparison,
} from "./explanation-engine";
import { generateFallbackSubstitute } from "./ai-engine";

export interface ScoredSubstitute {
  name: string;
  score: number;
  reason: string;
  explanation: string;
  improvements: string[];
  nutrition: NutritionRow;
  estimatedOriginalNutrition?: NutritionRow;
  comparisonHighlights?: {
    original: { name: string; highlights: string[] };
    substitute: { name: string; highlights: string[] };
    improvementSummary: string;
  };
}

export interface IngredientAnalysis {
  name: string;
  normalizedName?: string;
  hasSubstitutes: boolean;
  substitutes: ScoredSubstitute[];
  originalNutrition: NutritionRow | null;
}

export interface RecipeAnalysisResult {
  parsedIngredients: IngredientAnalysis[];
  originalNutritionTotal: NutritionRow;
  substitutedNutritionTotal: NutritionRow;
  substituteCount: number;
}

interface JoinedIngredient {
  name: string;
  canonicalName: string | null;
  category: string;
  functionalRole: string | null;
  ingredientId: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sugar: number | null;
  sodium: number | null;
}

const resolvedIngredientCache = new Map<string, JoinedIngredient | null>();

function getDbOrThrow() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

export function invalidateSubstitutionCaches() {
  resolvedIngredientCache.clear();
}

export function parseIngredients(recipeText: string): string[] {
  const parts = recipeText.split(",").map((s) => s.trim()).filter(Boolean);
  const names: string[] = [];
  for (const part of parts) {
    const cleaned = part
      .replace(/^\d+[\d./]*\s*/g, "")
      .replace(
        /^(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|grams?|g|ml|pounds?|lbs?|liters?|l|pinch|dash|handful|cloves?|slices?|pieces?|sticks?|heads?|bunche?s?|sprigs?|stalks?|cans?|bottles?|jars?|packets?|bags?|boxes?|containers?)\s+/gi,
        ""
      )
      .replace(/\s*\(.*?\)\s*/g, " ")
      .trim()
      .toLowerCase();
    if (cleaned && cleaned.length > 1) names.push(cleaned);
  }
  return names;
}

function stripPlural(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ves")) return `${word.slice(0, -3)}f`;
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

function normalizeSearchTerm(input: string): string {
  return stripPlural(
    input
      .toLowerCase()
      .replace(/[^\w\s%-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function inferRole(name: string, category?: string | null): string {
  const text = `${name} ${category || ""}`.toLowerCase();
  if (/(stevia|sweetener|sugar|honey|syrup|molasses|monk fruit|fructose|sucralose|aspartame)/.test(text)) return "sweetener";
  if (/(milk|soymilk|soy milk|almond milk|oat milk|coconut milk|cream|yogurt|yoghurt|kefir)/.test(text)) return "dairy";
  if (/(butter|oil|ghee|margarine|shortening|lard|tallow)/.test(text)) return "fat";
  if (/(flour|starch|cornstarch|arrowroot|tapioca)/.test(text)) return "thickener";
  if (/(salt|soy sauce|vinegar|seasoning|spice)/.test(text)) return "seasoning";
  return "other";
}

function isLikelySingleIngredientLabel(label: string): boolean {
  const t = normalizeSearchTerm(label);
  const tokenCount = t.split(" ").filter(Boolean).length;
  if (tokenCount > 5) return false;
  if (/(beverage|drink|candy|cookie|cake|frozen|prepared|commercial|dessert|bar|soup)/.test(t)) return false;
  return true;
}

function lexicalScore(term: string, candidate: JoinedIngredient): number {
  const t = normalizeSearchTerm(term);
  const name = normalizeSearchTerm(candidate.name);
  const canonical = normalizeSearchTerm(candidate.canonicalName || "");
  let score = 0;

  if (name === t || canonical === t) score += 200;
  if (name.startsWith(`${t} `) || name.startsWith(`${t},`)) score += 120;
  if (canonical.startsWith(`${t} `) || canonical.startsWith(`${t},`)) score += 100;
  if (name.includes(` ${t} `) || canonical.includes(` ${t} `)) score += 70;
  if (name.includes(t) || canonical.includes(t)) score += 40;

  if (/(commercial|prepared|frozen|candy|cookie|cake)/.test(canonical)) score -= 25;
  const tokenCount = name.split(" ").filter(Boolean).length;
  if (tokenCount > 4) score -= (tokenCount - 4) * 8;
  if (candidate.functionalRole) score += 5;
  return score;
}

function toNutrition(row: JoinedIngredient | null | undefined): NutritionRow {
  if (!row) return zeroNutrition();
  return {
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    sugar: row.sugar,
    sodium: row.sodium,
  };
}

async function resolveIngredient(term: string): Promise<JoinedIngredient | null> {
  const database = getDbOrThrow();
  const key = normalizeSearchTerm(term);
  if (!key) return null;
  if (resolvedIngredientCache.has(key)) return resolvedIngredientCache.get(key) ?? null;

  const likeKey = `%${key}%`;
  const rows = await database
    .select({
      name: ingredientsTable.name,
      canonicalName: ingredientsTable.canonicalName,
      category: ingredientsTable.category,
      functionalRole: ingredientsTable.functionalRole,
      ingredientId: ingredientsTable.id,
      calories: nutritionTable.calories,
      protein: nutritionTable.protein,
      carbs: nutritionTable.carbs,
      fat: nutritionTable.fat,
      sugar: nutritionTable.sugar,
      sodium: nutritionTable.sodium,
    })
    .from(ingredientsTable)
    .leftJoin(nutritionTable, eq(nutritionTable.ingredientId, ingredientsTable.id))
    .where(
      sql`lower(${ingredientsTable.name}) = ${key}
          OR lower(coalesce(${ingredientsTable.canonicalName}, '')) = ${key}
          OR lower(${ingredientsTable.name}) LIKE ${likeKey}
          OR lower(coalesce(${ingredientsTable.canonicalName}, '')) LIKE ${likeKey}`
    )
    .limit(250);

  if (rows.length === 0) {
    resolvedIngredientCache.set(key, null);
    return null;
  }

  const best = rows
    .map((r) => ({ row: r as JoinedIngredient, score: lexicalScore(key, r as JoinedIngredient) }))
    .sort((a, b) => b.score - a.score)[0]?.row ?? null;

  resolvedIngredientCache.set(key, best);
  return best;
}

async function getFeedbackRating(ingredient: string, substitute: string): Promise<number | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select({ avgRating: sql<number>`AVG(${feedbackTable.rating})` })
      .from(feedbackTable)
      .where(
        sql`lower(${feedbackTable.ingredient}) = lower(${ingredient})
            AND lower(${feedbackTable.substitute}) = lower(${substitute})`
      );
    const value = rows[0]?.avgRating;
    return value !== null && value !== undefined ? Number(value) : null;
  } catch {
    return null;
  }
}

function roleCompatible(origRole: string, subRole: string): boolean {
  if (origRole === "other") return true;
  if (origRole === "sweetener") return subRole === "sweetener";
  if (origRole === "dairy") return subRole === "dairy";
  if (origRole === "fat") return subRole === "fat" || subRole === "dairy";
  if (origRole === "thickener") return subRole === "thickener";
  if (origRole === "seasoning") return subRole === "seasoning";
  return subRole === origRole;
}

function clearlyUnhealthySwap(orig: NutritionRow, sub: NutritionRow, role: string): boolean {
  const oCal = orig.calories ?? 0;
  const oSug = orig.sugar ?? 0;
  const oSod = orig.sodium ?? 0;
  const sCal = sub.calories ?? 0;
  const sSug = sub.sugar ?? 0;
  const sSod = sub.sodium ?? 0;

  if (role === "sweetener" && sSug > oSug + 1) return true;
  if (role === "fat" && sCal > oCal * 1.35 && sSug > oSug + 2) return true;
  if (sCal > oCal * 1.5 && sSug > oSug + 4 && sSod > oSod * 1.5) return true;
  return false;
}

function adjustRoleScore(
  baseScore: number,
  origRole: string,
  subRole: string,
  subName: string,
  origNut: NutritionRow,
  subNut: NutritionRow
): number {
  let score = baseScore;
  const lowerName = subName.toLowerCase();
  const subSugar = subNut.sugar ?? 0;
  const subCalories = subNut.calories ?? 0;
  const origSodium = origNut.sodium ?? 0;
  const subSodium = subNut.sodium ?? 0;

  if (origRole === "sweetener") {
    if (/(sausage|garlic|chicken|beef|fish|wine|beer|juice|smoothie|drink)/.test(lowerName)) score -= 60;
    if (/(stevia|monk fruit|sucralose|aspartame|sweetener)/.test(lowerName)) score += 35;
    if (subSugar <= 1 && subCalories <= 20) score += 25;
    if (/(syrup|honey|sugar)/.test(lowerName) && subSugar > 20) score -= 18;
    if (subSugar > 30 || subCalories > 250) score -= 35;
  }

  if (origRole === "fat") {
    if (subRole === "dairy") score += 12;
    if (/(margarine|spread|shortening)/.test(lowerName)) score -= 12;
    if (subSodium > origSodium * 1.2) score -= 10;
  }

  if (origRole === "dairy") {
    if (/(milk|soymilk|soy milk|almond milk|oat milk|coconut milk|rice milk|yogurt|kefir)/.test(lowerName)) {
      score += 10;
    }
    if (/(wine|beer|sauce)/.test(lowerName)) score -= 25;
  }

  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

async function findSubstitutes(origName: string): Promise<ScoredSubstitute[]> {
  const database = getDbOrThrow();
  const original = await resolveIngredient(origName);
  const origNut = toNutrition(original);
  const origRole = inferRole(origName, original?.category);

  const directRows = await database
    .select({
      substitute: substitutionsTable.substituteIngredient,
      confidence: substitutionsTable.confidence,
    })
    .from(substitutionsTable)
    .where(sql`lower(${substitutionsTable.originalIngredient}) = lower(${origName})`)
    .limit(150);

  const candidateTerms = new Map<string, { reason: string; isDirect: boolean; confidence?: number }>();
  for (const row of directRows) {
    const t = normalizeSearchTerm(row.substitute);
    if (!t || t === normalizeSearchTerm(origName)) continue;
    if (!candidateTerms.has(t)) {
      candidateTerms.set(t, {
        reason: "Verified direct substitution from dataset",
        isDirect: true,
        confidence: row.confidence ?? 0.5,
      });
    }
  }

  if (original) {
    const neighborRows = await database
      .select({
        name: ingredientsTable.name,
      })
      .from(ingredientsTable)
      .where(
        sql`${ingredientsTable.category} = ${original.category}
            OR ${ingredientsTable.functionalRole} = ${original.functionalRole}`
      )
      .limit(250);
    for (const row of neighborRows) {
      const t = normalizeSearchTerm(row.name);
      if (!t || t === normalizeSearchTerm(origName)) continue;
      if (!candidateTerms.has(t)) {
        candidateTerms.set(t, {
          reason: "Category/role neighbor from USDA data",
          isDirect: false,
        });
      }
    }
  }

  const scoredByName = new Map<string, ScoredSubstitute>();
  for (const [term, meta] of candidateTerms.entries()) {
    if (!isLikelySingleIngredientLabel(term)) continue;
    const resolved = await resolveIngredient(term);
    if (!resolved) continue;
    if (!isLikelySingleIngredientLabel(resolved.name) && !isLikelySingleIngredientLabel(resolved.canonicalName || "")) continue;
    if (normalizeSearchTerm(resolved.name) === normalizeSearchTerm(original?.name || origName)) continue;

    const subRole = inferRole(resolved.name, resolved.category);
    if (!roleCompatible(origRole, subRole)) continue;

    const subNut = toNutrition(resolved);

    if (origRole === "sweetener") {
      const sweetLabel = `${resolved.name} ${resolved.canonicalName || ""}`.toLowerCase();
      if (!/(stevia|monk|sweetener|sugar|syrup|honey|fructose|agave|molasses|jaggery|sucralose|aspartame)/.test(sweetLabel)) {
        continue;
      }
      if (/(sausage|chicken|beef|fish|garlic|wine|beer|juice|smoothie|drink)/.test(sweetLabel)) {
        continue;
      }
      if ((subNut.sugar ?? 0) > 30 || (subNut.calories ?? 0) > 250) {
        continue;
      }
    }

    if (clearlyUnhealthySwap(origNut, subNut, origRole)) continue;

    const healthScore = healthImprovementScore(origNut, subNut);
    if (healthScore < 0.35 && meta.isDirect) continue;

    const fbRating = await getFeedbackRating(origName, resolved.name);
    const baseScore = scoreSubstitute({
      origNut,
      subNut,
      origRole,
      subRole,
      origCategory: original?.category ?? "",
      subCategory: resolved.category ?? "",
      feedbackRating: fbRating,
      isDirect: meta.isDirect,
      confidence: meta.confidence,
    });
    const score = adjustRoleScore(baseScore, origRole, subRole, resolved.name, origNut, subNut);

    const explanation = generateExplanation(
      origName,
      resolved.name,
      origNut,
      subNut,
      origRole,
      meta.reason
    );
    const comparison = generateNutritionalComparison(origName, resolved.name, origNut, subNut);

    const candidate: ScoredSubstitute = {
      name: resolved.name,
      score,
      reason: explanation.reason,
      explanation: explanation.explanation,
      improvements: explanation.improvements,
      nutrition: subNut,
      comparisonHighlights: comparison,
    };

    const existing = scoredByName.get(candidate.name.toLowerCase());
    if (!existing || candidate.score > existing.score) {
      scoredByName.set(candidate.name.toLowerCase(), candidate);
    }
  }

  const scored = Array.from(scoredByName.values());
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const geminiResult = await generateFallbackSubstitute(origName);
    if (geminiResult) {
      const normalizedSub = await normalizeIngredient(geminiResult.name);
      const subResolved = await resolveIngredient(normalizedSub);

      const aiOrigNut = geminiResult.originalNutrition;
      const aiSubNut = geminiResult.substituteNutrition;
      const hasAiNutrition = aiSubNut && (aiSubNut.calories !== undefined || aiSubNut.sugar !== undefined);

      const effectiveOrigNut = aiOrigNut && (aiOrigNut.calories !== undefined || aiOrigNut.sugar !== undefined)
        ? { calories: aiOrigNut.calories ?? 0, protein: aiOrigNut.protein ?? 0, carbs: aiOrigNut.carbs ?? 0, fat: aiOrigNut.fat ?? 0, sugar: aiOrigNut.sugar ?? 0, sodium: aiOrigNut.sodium ?? 0 }
        : origNut;

      const subNut = subResolved
        ? toNutrition(subResolved)
        : hasAiNutrition
          ? { calories: aiSubNut!.calories ?? 0, protein: aiSubNut!.protein ?? 0, carbs: aiSubNut!.carbs ?? 0, fat: aiSubNut!.fat ?? 0, sugar: aiSubNut!.sugar ?? 0, sodium: aiSubNut!.sodium ?? 0 }
          : origNut;

      const comparison = generateNutritionalComparison(
        origName,
        subResolved?.name || geminiResult.name,
        effectiveOrigNut,
        subNut,
      );

      scored.push({
        name: geminiResult.name,
        score: geminiResult.score,
        reason: `AI-suggested: ${geminiResult.reason}`,
        explanation: geminiResult.explanation,
        improvements: geminiResult.improvements,
        nutrition: subNut,
        estimatedOriginalNutrition: effectiveOrigNut,
        comparisonHighlights: comparison,
      });
    } else {
      scored.push({
        name: `Any ${origRole} alternative`,
        score: 50,
        reason: `No healthy substitute found for "${origName}" in current data coverage.`,
        explanation: `We could not find a strong healthy substitute for "${origName}". Try another ingredient variant or expand dataset coverage.`,
        improvements: [],
        nutrition: {},
      });
    }
  }

  return scored.slice(0, 6);
}

export async function analyzeRecipe(recipeText: string): Promise<RecipeAnalysisResult> {
  const rawIngredients = parseIngredients(recipeText);
  if (rawIngredients.length === 0) {
    throw new Error("Could not parse any ingredients from the recipe text.");
  }

  const normalizedIngredients = await Promise.all(rawIngredients.map((raw) => normalizeIngredient(raw)));
  let originalTotal = zeroNutrition();
  let substitutedTotal = zeroNutrition();
  const results: IngredientAnalysis[] = [];

  for (let i = 0; i < normalizedIngredients.length; i++) {
    const normalized = normalizedIngredients[i];
    const raw = rawIngredients[i];

    try {
      const original = await resolveIngredient(normalized);
      const origNut = toNutrition(original);

      const substitutes = await findSubstitutes(normalized);
      const hasSubstitutes = substitutes.length > 0 && !substitutes[0].name.startsWith("Any ");

      const effectiveOrigNut = (!original && hasSubstitutes && substitutes[0].estimatedOriginalNutrition)
        ? substitutes[0].estimatedOriginalNutrition
        : origNut;

      originalTotal = addNutrition(originalTotal, effectiveOrigNut);

      if (hasSubstitutes) {
        substitutedTotal = addNutrition(substitutedTotal, substitutes[0].nutrition);
      } else {
        substitutedTotal = addNutrition(substitutedTotal, effectiveOrigNut);
      }

      results.push({
        name: raw,
        normalizedName: normalized !== raw ? normalized : undefined,
        hasSubstitutes,
        substitutes,
        originalNutrition: effectiveOrigNut,
      });
    } catch (err) {
      console.error("analyzeRecipe ingredient failure", { raw, normalized, err });
      results.push({
        name: raw,
        normalizedName: normalized !== raw ? normalized : undefined,
        hasSubstitutes: false,
        substitutes: [],
        originalNutrition: zeroNutrition(),
      });
    }
  }

  return {
    parsedIngredients: results,
    originalNutritionTotal: originalTotal,
    substitutedNutritionTotal: substitutedTotal,
    substituteCount: results.filter((r) => r.hasSubstitutes).length,
  };
}

export async function getSubstitutesForIngredient(rawName: string): Promise<ScoredSubstitute[]> {
  const normalized = await normalizeIngredient(rawName);
  return findSubstitutes(normalized);
}

function zeroNutrition() {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };
}

function addNutrition(
  a: { calories: number; protein: number; carbs: number; fat: number; sugar: number; sodium: number },
  b: NutritionRow
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
