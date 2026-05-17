/**
 * AI Engine — NVIDIA Gemma 3 Fallback Service
 * ───────────────────────────────────────────
 * Provides AI-generated substitute suggestions ONLY when
 * the core dataset-driven pipeline returns zero results.
 *
 * Uses NVIDIA's OpenAI-compatible API endpoint for Gemma 3.
 * This is a FALLBACK layer — NOT a primary substitution source.
 * The application continues functioning normally if the API
 * is unavailable.
 */

import OpenAI from "openai";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface AiSubstituteResult {
  name: string;
  score: number;
  reason: string;
  explanation: string;
  improvements: string[];
  nonFood?: boolean;
  originalNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
    sodium?: number;
  };
  substituteNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
    sodium?: number;
  };
}

// ─── CONFIGURATION ───────────────────────────────────────────────────────────

const NVIDIA_API_KEY = process.env["NVIDIA_API_KEY"];
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "google/gemma-3n-e2b-it";
const TIMEOUT_MS = 30_000;

// ─── FUNCTIONAL CATEGORY MAPPING ─────────────────────────────────────────────

const FALLBACK_CATEGORY_LABELS: Record<string, string> = {
  sweetener: "a natural or artificial sweetener",
  dairy: "a dairy or plant-based dairy alternative",
  fat: "a healthy fat or oil alternative",
  thickener: "a natural thickener or starch alternative",
  seasoning: "a seasoning, herb, or spice alternative",
  other: "a healthy alternative that preserves the original culinary function",
};

function inferFunctionalCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/(stevia|sweetener|sugar|honey|syrup|molasses|monk\s?fruit|agave|fructose|sucralose|aspartame|saccharin)/.test(lower)) return "sweetener";
  if (/(milk|cream|yogurt|yoghurt|kefir|cheese|soy\s?milk|almond\s?milk|oat\s?milk|coconut\s?milk|rice\s?milk)/.test(lower)) return "dairy";
  if (/(butter|oil|ghee|margarine|shortening|lard|tallow|olive\s?oil|coconut\s?oil|avocado\s?oil)/.test(lower)) return "fat";
  if (/(flour|starch|cornstarch|arrowroot|tapioca|potato\s?starch|rice\s?flour|almond\s?flour|coconut\s?flour)/.test(lower)) return "thickener";
  if (/(salt|soy\s?sauce|vinegar|seasoning|spice|herb|pepper|cumin|paprika|turmeric|cinnamon|garlic|onion\s?powder)/.test(lower)) return "seasoning";
  return "other";
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────

function buildPrompt(ingredient: string, category: string): string {
  return `You are a Clinical Nutritionist and Food Science Expert.

Given the ingredient: "${ingredient}"

First, determine if "${ingredient}" is a real food ingredient commonly used in cooking or baking.
- If NO (e.g., it is a non-food item like furniture, electronics, a name, or a chemical), return ONLY this JSON: {"nonFood": true}
- If YES, ignore this instruction and continue with the substitute suggestion below.

Suggest ONE healthy substitute that:
1. Preserves the ingredient's FUNCTIONALITY in recipes (${FALLBACK_CATEGORY_LABELS[category] || "a healthy alternative"})
2. Belongs to the SAME FUNCTIONAL CATEGORY
3. Is measurably healthier (lower calories, sugar, sodium, or higher protein/fiber)
4. Is a real, commonly available food ingredient

Valid examples: milk→almond milk, sugar→stevia, butter→Greek yogurt, flour→whole wheat flour, egg→flax egg, cream→coconut cream.

INVALID (different category): milk→cucumber, sugar→lettuce, butter→orange juice, flour→apple, salt→chocolate, egg→strawberry.

CRITICAL: "${ingredient}" belongs to the "${category}" functional category. The substitute MUST also belong to or be usable as a "${category}" in recipes.

Also include estimated nutritional values per 100g. These are best estimates based on your knowledge — no need to be exact. Include for BOTH the original ingredient "${ingredient}" AND the substitute.

Return ONLY valid JSON (no markdown, no code fences, no backticks):
{
  "name": "Substitute Name",
  "score": 85,
  "reason": "Short one-sentence reason why this is a good healthy substitute",
  "explanation": "Detailed 2-3 sentence explanation of the nutritional and functional benefits",
  "improvements": ["Specific improvement 1", "Specific improvement 2"],
  "originalNutrition": {"calories": 100, "protein": 2, "carbs": 20, "fat": 1, "sugar": 5, "sodium": 200},
  "substituteNutrition": {"calories": 30, "protein": 1, "carbs": 5, "fat": 0.5, "sugar": 0, "sodium": 50}
}

All nutrition values are per 100g. Use realistic estimates. "calories" in kcal, "protein"/"carbs"/"fat"/"sugar" in grams, "sodium" in mg.

The score must be a number between 0 and 100. Higher scores for greater health improvement and better functional match.`;
}

// ─── RESPONSE PARSER ─────────────────────────────────────────────────────────

function parseAiResponse(text: string): AiSubstituteResult | null {
  try {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    if (parsed.nonFood === true) {
      return { name: "", score: 0, reason: "", explanation: "", improvements: [], nonFood: true };
    }

    if (!parsed.name || typeof parsed.name !== "string") {
      console.warn("[AI Engine] Missing or invalid 'name' in model response");
      return null;
    }

    const score = typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 100
      ? Math.round(parsed.score)
      : 75;

    const reason = typeof parsed.reason === "string" && parsed.reason.length > 0
      ? parsed.reason
      : `AI-suggested healthy substitute for ${parsed.name}`;

    const explanation = typeof parsed.explanation === "string" && parsed.explanation.length > 0
      ? parsed.explanation
      : `${parsed.name} is a healthier alternative that preserves similar functionality in your recipe.`;

    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements.filter((i: unknown) => typeof i === "string")
      : [];

    const parseNut = (obj: unknown): AiSubstituteResult["substituteNutrition"] => {
      if (!obj || typeof obj !== "object") return undefined;
      const o = obj as Record<string, unknown>;
      const toNum = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
      return {
        calories: toNum(o.calories),
        protein: toNum(o.protein),
        carbs: toNum(o.carbs),
        fat: toNum(o.fat),
        sugar: toNum(o.sugar),
        sodium: toNum(o.sodium),
      };
    };

    const originalNutrition = parseNut(parsed.originalNutrition);
    const substituteNutrition = parseNut(parsed.substituteNutrition);

    return { name: parsed.name, score, reason, explanation, improvements, originalNutrition, substituteNutrition };
  } catch {
    return null;
  }
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Generate a fallback substitute using NVIDIA Gemma 3.
 *
 * Returns null (never throws) when:
 *  - API key is not configured
 *  - Network error or timeout
 *  - Malformed response
 *  - API quota exceeded
 */
export async function generateFallbackSubstitute(
  ingredient: string,
): Promise<AiSubstituteResult | null> {
  if (!NVIDIA_API_KEY) {
    console.log("[AI Engine] NVIDIA_API_KEY not configured — skipping AI fallback");
    return null;
  }

  const category = inferFunctionalCategory(ingredient);
  const prompt = buildPrompt(ingredient, category);

  try {
    const client = new OpenAI({
      apiKey: NVIDIA_API_KEY,
      baseURL: NVIDIA_BASE_URL,
      timeout: TIMEOUT_MS,
      maxRetries: 0,
    });

    const result = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages: [
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("[AI Engine] Empty response from NVIDIA API for:", ingredient);
      return null;
    }

    const parsed = parseAiResponse(content);

    if (!parsed) {
      console.warn("[AI Engine] Failed to parse NVIDIA API response for:", ingredient);
      return null;
    }

    console.log("[AI Engine] NVIDIA fallback generated for:", ingredient, "→", parsed.name);
    return parsed;
  } catch (err: any) {
    if (err.message?.includes("timed out") || err.message?.includes("timeout")) {
      console.warn("[AI Engine] NVIDIA API request timed out for:", ingredient);
    } else if (err.status === 401 || err.status === 403) {
      console.warn("[AI Engine] Invalid NVIDIA_API_KEY");
    } else if (err.status === 429) {
      console.warn("[AI Engine] NVIDIA API rate limit exceeded for:", ingredient);
    } else {
      console.warn("[AI Engine] NVIDIA API request failed for:", ingredient, err?.message ?? err);
    }
    return null;
  }
}
