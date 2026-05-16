/**
 * Ingredient Normalization Engine
 * ─────────────────────────────────
 * Resolves raw user input ("brown sugars", "low-fat milk", "organic cane sugar")
 * into canonical ingredient names ("sugar", "milk", "sugar") using:
 *   1. Lowercase + trim
 *   2. Plural stripping
 *   3. Descriptor cleanup (removes adjectives like "organic", "low-fat")
 *   4. Static alias map (fast, comprehensive)
 *   5. DB alias lookup (for user-added aliases)
 */

import { db, ingredientAliasesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─── STATIC ALIAS MAP ────────────────────────────────────────────────────────
// Covers the most common ingredient variants. This is the first-pass resolver.

const ALIAS_MAP: Record<string, string> = {
  // Sugars
  "brown sugar": "sugar", "white sugar": "sugar", "granulated sugar": "sugar",
  "caster sugar": "sugar", "powdered sugar": "sugar", "confectioners sugar": "sugar",
  "raw sugar": "sugar", "demerara sugar": "sugar", "turbinado sugar": "sugar",
  "organic sugar": "sugar", "cane sugar": "sugar", "organic cane sugar": "sugar",
  "superfine sugar": "sugar", "icing sugar": "sugar", "muscovado sugar": "sugar",
  "light brown sugar": "sugar", "dark brown sugar": "sugar",
  // Milks
  "low-fat milk": "milk", "skim milk": "milk", "whole milk": "milk",
  "2% milk": "milk", "nonfat milk": "milk", "fat-free milk": "milk",
  "reduced fat milk": "milk", "semi-skimmed milk": "milk", "skimmed milk": "milk",
  "full fat milk": "milk", "1% milk": "milk", "homogenized milk": "milk",
  "pasteurized milk": "milk", "organic milk": "milk", "raw milk": "milk",
  // Flours
  "all-purpose flour": "flour", "whole wheat flour": "flour", "bread flour": "flour",
  "cake flour": "flour", "self-rising flour": "flour", "plain flour": "flour",
  "pastry flour": "flour", "strong flour": "flour", "wheat flour": "flour",
  "all purpose flour": "flour", "self rising flour": "flour", "unbleached flour": "flour",
  "bleached flour": "flour", "enriched flour": "flour", "organic flour": "flour",
  // Butters
  "unsalted butter": "butter", "salted butter": "butter",
  "softened butter": "butter", "melted butter": "butter",
  "clarified butter": "butter", "sweet cream butter": "butter",
  "cultured butter": "butter", "european butter": "butter", "whipped butter": "butter",
  // Oils
  "vegetable oil": "olive oil", "canola oil": "olive oil", "sunflower oil": "olive oil",
  "corn oil": "olive oil", "rapeseed oil": "olive oil", "peanut oil": "olive oil",
  "grapeseed oil": "olive oil", "safflower oil": "olive oil",
  "extra virgin olive oil": "olive oil", "light olive oil": "olive oil",
  // Salts
  "sea salt": "salt", "kosher salt": "salt", "table salt": "salt",
  "himalayan salt": "salt", "rock salt": "salt", "fine salt": "salt",
  "coarse salt": "salt", "fleur de sel": "salt", "celtic salt": "salt",
  "himalayan pink salt": "salt", "flaky salt": "salt", "iodized salt": "salt",
  // Creams
  "heavy cream": "cream", "double cream": "cream", "whipping cream": "cream",
  "light cream": "cream", "single cream": "cream", "heavy whipping cream": "cream",
  "half and half": "cream", "half-and-half": "cream",
  // Yogurts
  "greek yogurt": "greek yogurt", "plain yogurt": "yogurt", "natural yogurt": "yogurt",
  "low-fat yogurt": "yogurt", "fat-free yogurt": "yogurt", "whole milk yogurt": "yogurt",
  // Chocolates
  "dark chocolate": "chocolate", "milk chocolate": "chocolate", "white chocolate": "chocolate",
  "semi-sweet chocolate": "chocolate", "bittersweet chocolate": "chocolate",
  "unsweetened chocolate": "chocolate", "chocolate chips": "chocolate",
  // Eggs
  "large egg": "egg", "medium egg": "egg", "small egg": "egg",
  "whole egg": "egg", "chicken egg": "egg", "free-range egg": "egg",
  "organic egg": "egg", "eggs": "egg",
  // Rice
  "white rice": "rice", "brown rice": "rice", "jasmine rice": "rice",
  "basmati rice": "rice", "long grain rice": "rice", "short grain rice": "rice",
  "arborio rice": "rice", "wild rice": "rice", "sushi rice": "rice",
  // Vinegars
  "white vinegar": "vinegar", "apple cider vinegar": "vinegar", "balsamic vinegar": "vinegar",
  "red wine vinegar": "vinegar", "rice vinegar": "vinegar", "malt vinegar": "vinegar",
  // Soy sauces
  "light soy sauce": "soy sauce", "dark soy sauce": "soy sauce", "tamari": "soy sauce",
  "low sodium soy sauce": "soy sauce",
};

// ─── DESCRIPTOR PATTERNS ─────────────────────────────────────────────────────
// Common adjectives/qualifiers that don't change the ingredient's identity.

const DESCRIPTOR_PATTERNS: RegExp[] = [
  /\b(organic|natural|fresh|dried|ground|minced|chopped|diced|sliced|grated)\b/gi,
  /\b(raw|cooked|roasted|toasted|frozen|canned|packed|prepared|unsweetened)\b/gi,
  /\b(low-fat|nonfat|fat-free|reduced-fat|light|lite|diet|sugar-free|unsalted)\b/gi,
  /\b(extra|pure|fine|coarse|whole|large|small|medium|mini|baby|jumbo)\b/gi,
  /\b(boneless|skinless|bone-in|skin-on)\b/gi,
  /\b(virgin|unrefined|refined|bleached|unbleached|enriched|fortified)\b/gi,
];

// ─── PLURAL RULES ────────────────────────────────────────────────────────────

function stripPlural(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ves")) return word.slice(0, -3) + "f";
  if (word.endsWith("ses") || word.endsWith("zes") || word.endsWith("xes") || word.endsWith("ches") || word.endsWith("shes")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    return word.slice(0, -1);
  }
  return word;
}

// ─── DB ALIAS CACHE ──────────────────────────────────────────────────────────
// Loaded once on first call; avoids repeated DB hits.

let dbAliasCache: Map<string, string> | null = null;

async function loadDbAliases(): Promise<Map<string, string>> {
  if (dbAliasCache) return dbAliasCache;
  dbAliasCache = new Map();
  if (!db) return dbAliasCache;
  try {
    const rows = await db.select().from(ingredientAliasesTable);
    for (const row of rows) {
      dbAliasCache.set(row.alias.toLowerCase().trim(), row.canonicalName.toLowerCase().trim());
    }
  } catch (err) {
    console.error("Failed to load DB aliases:", err);
  }
  return dbAliasCache;
}

/** Invalidate the alias cache (call after inserting new aliases). */
export function invalidateAliasCache() {
  dbAliasCache = null;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Normalize an ingredient name through the full pipeline:
 *   lowercase → alias map → descriptor cleanup → plural strip → DB lookup
 */
export async function normalizeIngredient(raw: string): Promise<string> {
  let name = raw.toLowerCase().trim();

  // Remove quantity-like prefixes that may have leaked through parsing
  name = name.replace(/^\d+[\d./]*\s*/, "");

  // 1. Strip descriptors
  for (const pattern of DESCRIPTOR_PATTERNS) {
    name = name.replace(pattern, "");
  }
  name = name.replace(/\s{2,}/g, " ").trim();

  // 2. Strip plurals
  const singular = stripPlural(name);

  // 3. DB alias lookup first (dataset-driven normalization)
  const dbAliases = await loadDbAliases();
  if (dbAliases.has(name)) return dbAliases.get(name)!;
  if (dbAliases.has(singular)) return dbAliases.get(singular)!;

  // 4. Static alias fallback (kept as safety net, not primary source)
  if (ALIAS_MAP[name]) return ALIAS_MAP[name];
  if (ALIAS_MAP[singular]) return ALIAS_MAP[singular];

  // 5. Return cleaned name (singular preferred if it changed)
  return singular !== name ? singular : name;
}

/**
 * Synchronous normalization (static aliases only, no DB).
 * Used when DB is unavailable.
 */
export function normalizeIngredientSync(raw: string): string {
  let name = raw.toLowerCase().trim();
  name = name.replace(/^\d+[\d./]*\s*/, "");
  if (ALIAS_MAP[name]) return ALIAS_MAP[name];
  for (const pattern of DESCRIPTOR_PATTERNS) {
    name = name.replace(pattern, "");
  }
  name = name.replace(/\s{2,}/g, " ").trim();
  if (ALIAS_MAP[name]) return ALIAS_MAP[name];
  const singular = stripPlural(name);
  if (ALIAS_MAP[singular]) return ALIAS_MAP[singular];
  return singular !== name ? singular : name;
}
