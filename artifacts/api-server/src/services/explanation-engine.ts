/**
 * Explanation Engine
 * ──────────────────
 * Generates human-readable, nutritionally-grounded explanations
 * for every substitution recommendation.
 *
 * Every recommendation includes:
 *   • WHY it was selected
 *   • WHAT nutritional improvement it provides
 */

import type { NutritionRow } from "./ml-engine";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ExplanationResult {
  /** Short reason string (one line) */
  reason: string;
  /** Detailed explanation paragraph */
  explanation: string;
  /** Key nutritional improvements */
  improvements: string[];
  /** Reduction percentages for each nutrient */
  reductions: Record<string, { original: number; substitute: number; changePercent: number; direction: "reduced" | "increased" | "unchanged" }>;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function pctChange(orig: number, sub: number): number {
  if (orig === 0) return sub === 0 ? 0 : 100;
  return Math.round(((sub - orig) / orig) * 100);
}

function formatNutrient(key: string): string {
  const labels: Record<string, string> = {
    calories: "calories",
    sugar: "sugar",
    sodium: "sodium",
    protein: "protein",
    fat: "fat",
    carbs: "carbohydrates",
  };
  return labels[key] ?? key;
}

function unitFor(key: string): string {
  if (key === "calories") return "kcal";
  if (key === "sodium") return "mg";
  return "g";
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Generate a full explanation for a substitution.
 */
export function generateExplanation(
  originalName: string,
  substituteName: string,
  origNut: NutritionRow,
  subNut: NutritionRow,
  functionalRole: string | null | undefined,
  matchSource: string,
  flavorSimilarity?: number,
): ExplanationResult {
  const nutrients = ["calories", "sugar", "sodium", "protein", "fat", "carbs"] as const;
  const reductions: ExplanationResult["reductions"] = {};
  const improvements: string[] = [];

  for (const key of nutrients) {
    const origVal = (origNut[key] as number) ?? 0;
    const subVal = (subNut[key] as number) ?? 0;
    const change = pctChange(origVal, subVal);
    const direction: "reduced" | "increased" | "unchanged" =
      change < -5 ? "reduced" : change > 5 ? "increased" : "unchanged";

    reductions[key] = {
      original: origVal,
      substitute: subVal,
      changePercent: change,
      direction,
    };

    // Track meaningful improvements
    if (key === "protein" && change > 10) {
      improvements.push(`${Math.abs(change)}% more protein (${subVal.toFixed(1)}${unitFor(key)} vs ${origVal.toFixed(1)}${unitFor(key)})`);
    } else if (key !== "protein" && change < -10) {
      improvements.push(`${Math.abs(change)}% less ${formatNutrient(key)} (${subVal.toFixed(1)}${unitFor(key)} vs ${origVal.toFixed(1)}${unitFor(key)})`);
    }
  }

  // Build the one-line reason
  const reason = buildReason(originalName, substituteName, reductions, functionalRole, matchSource, flavorSimilarity);

  // Build the detailed explanation
  const explanation = buildDetailedExplanation(
    originalName, substituteName, reductions, improvements, functionalRole, matchSource
  );

  return { reason, explanation, improvements, reductions };
}

// ─── REASON BUILDER ──────────────────────────────────────────────────────────

function buildReason(
  origName: string,
  subName: string,
  reductions: ExplanationResult["reductions"],
  role: string | null | undefined,
  source: string,
  flavorSimilarity?: number,
): string {
  const parts: string[] = [];

  // Lead with the functional role context
  const roleStr = role ? ` as a ${role.toLowerCase()}` : "";

  // Find the most significant improvement
  const sugarRed = reductions.sugar;
  const calRed = reductions.calories;
  const sodRed = reductions.sodium;
  const protGain = reductions.protein;

  if (sugarRed && sugarRed.direction === "reduced" && Math.abs(sugarRed.changePercent) > 30) {
    parts.push(`significantly lower sugar content`);
  }
  if (calRed && calRed.direction === "reduced" && Math.abs(calRed.changePercent) > 20) {
    parts.push(`fewer calories`);
  }
  if (sodRed && sodRed.direction === "reduced" && Math.abs(sodRed.changePercent) > 20) {
    parts.push(`lower sodium`);
  }
  if (protGain && protGain.direction === "increased" && protGain.changePercent > 20) {
    parts.push(`more protein`);
  }

  if (flavorSimilarity !== undefined && flavorSimilarity >= 0.5) {
    parts.push(`a compatible flavor profile`);
  }

  if (parts.length === 0) {
    if (source.includes("direct") || source.includes("Verified")) {
      return `${capitalize(subName)} is a verified healthy substitute for ${origName}${roleStr}.`;
    }
    if (flavorSimilarity !== undefined && flavorSimilarity >= 0.5) {
      return `${capitalize(subName)} shares a compatible flavor profile with ${origName}${roleStr}.`;
    }
    return `${capitalize(subName)} can serve${roleStr} with a comparable nutritional profile.`;
  }

  return `${capitalize(subName)} is recommended because it provides ${parts.join(" and ")} compared to ${origName}${roleStr}.`;
}

// ─── DETAILED EXPLANATION BUILDER ────────────────────────────────────────────

function buildDetailedExplanation(
  origName: string,
  subName: string,
  reductions: ExplanationResult["reductions"],
  improvements: string[],
  role: string | null | undefined,
  source: string,
): string {
  const sentences: string[] = [];

  // Opening
  const roleStr = role ? `, which also functions as a ${role.toLowerCase()},` : "";
  sentences.push(`${capitalize(subName)}${roleStr} is a healthier alternative to ${origName}.`);

  // Key improvements
  if (improvements.length > 0) {
    sentences.push(`Key improvements: ${improvements.join("; ")}.`);
  }

  // Highlight dramatic differences
  const sugarRed = reductions.sugar;
  if (sugarRed && sugarRed.original > 0 && sugarRed.substitute === 0) {
    sentences.push(`It contains zero sugar compared to ${sugarRed.original.toFixed(0)}g per 100g in ${origName}.`);
  }

  const calRed = reductions.calories;
  if (calRed && calRed.direction === "reduced" && Math.abs(calRed.changePercent) > 50) {
    sentences.push(`Calorie content is reduced by ${Math.abs(calRed.changePercent)}%, from ${calRed.original.toFixed(0)} to ${calRed.substitute.toFixed(0)} kcal per 100g.`);
  }

  // Source context
  if (source.includes("direct") || source.includes("Verified")) {
    sentences.push("This is a verified substitution supported by nutritional data.");
  } else if (source.includes("Functional")) {
    sentences.push("This substitution preserves the same culinary function in your recipe.");
  } else if (source.includes("Nutritionally similar")) {
    sentences.push("This ingredient was identified through nutritional similarity analysis.");
  }

  return sentences.join(" ");
}

// ─── NUTRITIONAL COMPARISON ─────────────────────────────────────────────────

/**
 * Generate a structured nutritional comparison between two ingredients.
 */
export function generateNutritionalComparison(
  origName: string,
  subName: string,
  origNut: NutritionRow,
  subNut: NutritionRow,
): {
  original: { name: string; highlights: string[] };
  substitute: { name: string; highlights: string[] };
  improvementSummary: string;
} {
  const origHighlights: string[] = [];
  const subHighlights: string[] = [];

  const keys = ["calories", "sugar", "sodium", "protein", "fat", "carbs"] as const;
  for (const key of keys) {
    const origVal = (origNut[key] as number) ?? 0;
    const subVal = (subNut[key] as number) ?? 0;

    if (key === "calories") {
      origHighlights.push(origVal > 300 ? "High calories" : origVal > 100 ? "Moderate calories" : "Low calories");
      subHighlights.push(subVal > 300 ? "High calories" : subVal > 100 ? "Moderate calories" : subVal === 0 ? "Zero calories" : "Low calories");
    } else if (key === "sugar") {
      origHighlights.push(origVal > 50 ? "Very high sugar" : origVal > 10 ? "High sugar" : origVal > 0 ? "Low sugar" : "No sugar");
      subHighlights.push(subVal > 50 ? "Very high sugar" : subVal > 10 ? "High sugar" : subVal > 0 ? "Low sugar" : "Zero sugar");
    } else if (key === "protein") {
      origHighlights.push(origVal > 15 ? "High protein" : origVal > 5 ? "Moderate protein" : "Low protein");
      subHighlights.push(subVal > 15 ? "High protein" : subVal > 5 ? "Moderate protein" : "Low protein");
    } else if (key === "sodium") {
      origHighlights.push(origVal > 500 ? "High sodium" : origVal > 100 ? "Moderate sodium" : "Low sodium");
      subHighlights.push(subVal > 500 ? "High sodium" : subVal > 100 ? "Moderate sodium" : "Low sodium");
    }
  }

  // Summary
  const betterCount = keys.filter((k) => {
    const o = (origNut[k] as number) ?? 0;
    const s = (subNut[k] as number) ?? 0;
    return k === "protein" ? s > o : s < o;
  }).length;

  const improvementSummary =
    betterCount >= 4
      ? `${capitalize(subName)} is significantly healthier than ${origName} across most nutritional metrics.`
      : betterCount >= 2
        ? `${capitalize(subName)} offers notable improvements over ${origName} in several key nutrients.`
        : `${capitalize(subName)} provides a comparable nutritional profile to ${origName}.`;

  return {
    original: { name: origName, highlights: origHighlights },
    substitute: { name: subName, highlights: subHighlights },
    improvementSummary,
  };
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
