/**
 * Flavor Engine — FlavorDB-based Similarity Scoring
 * ────────────────────────────────────────────────
 * Maps ingredients to FlavorDB flavor profiles and computes
 * flavor similarity between any two ingredients.
 *
 * Two ingredients sharing the same flavordb_id share
 * significant flavor compound overlap, making them
 * excellent taste-compatible substitutes.
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

let flavordbPath: string;

// 1. Try resolving relative to process.cwd() (workspace root)
const cwdPath = path.resolve(
  process.cwd(),
  "substitution_dataset",
  "archive (4)",
  "ingredient_to_flavordb.json"
);

// 2. Try resolving relative to process.cwd() if started from a subdirectory (like artifacts/api-server)
const subcwdPath = path.resolve(
  process.cwd(),
  "..", "..",
  "substitution_dataset",
  "archive (4)",
  "ingredient_to_flavordb.json"
);

// 3. Fallback to production relative-path resolution (__dirname or import.meta.url)
let productionPath: string;
try {
  // If running compiled CommonJS in dist/index.cjs, we are at depth 3
  productionPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..", "..", "..",
    "substitution_dataset", "archive (4)", "ingredient_to_flavordb.json"
  );
} catch {
  // CommonJS fallback
  productionPath = path.resolve(
    __dirname,
    "..", "..", "..",
    "substitution_dataset", "archive (4)", "ingredient_to_flavordb.json"
  );
}

// 4. Ultimate absolute path fallback for Render container environment
const renderPath = "/opt/render/project/src/substitution_dataset/archive (4)/ingredient_to_flavordb.json";

if (existsSync(cwdPath)) {
  flavordbPath = cwdPath;
} else if (existsSync(subcwdPath)) {
  flavordbPath = subcwdPath;
} else if (existsSync(productionPath)) {
  flavordbPath = productionPath;
} else {
  flavordbPath = renderPath;
}

interface FlavordbEntry {
  ingredient: string;
  flavordb_id: number;
  flavordb: string;
  cosine_similarity: number;
}

// ─── LAZY LOADED CACHE ──────────────────────────────────────────────────────

let flavorMap: Map<string, FlavordbEntry> | null = null;
let loadAttempted = false;

async function loadFlavorMap(): Promise<Map<string, FlavordbEntry>> {
  if (flavorMap) return flavorMap;
  if (loadAttempted) return flavorMap ?? new Map();
  loadAttempted = true;

  try {
    const raw = await readFile(flavordbPath, "utf-8");
    const data: Record<string, FlavordbEntry> = JSON.parse(raw);
    flavorMap = new Map();

    for (const entry of Object.values(data)) {
      const normalized = entry.ingredient.toLowerCase().trim();
      flavorMap.set(normalized, entry);
    }

    console.log(`[Flavor Engine] Loaded ${flavorMap.size} flavor profiles`);
  } catch (err) {
    console.warn("[Flavor Engine] Failed to load flavor dataset:", (err as Error)?.message);
    flavorMap = new Map();
  }

  return flavorMap;
}

export function invalidateFlavorCache() {
  flavorMap = null;
  loadAttempted = false;
}

// ─── NORMALIZATION ──────────────────────────────────────────────────────────

function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findClosestMatch(
  name: string,
  map: Map<string, FlavordbEntry>,
): FlavordbEntry | null {
  const normalized = normalizeIngredient(name);

  // Direct match
  if (map.has(normalized)) return map.get(normalized)!;

  // Try removing common suffixes
  const withoutSuffix = normalized.replace(/\s+(powder|fresh|dried|ground|whole|raw|organic|leaf|leaves|root|seed|oil|paste|sauce|extract|juice|peel|zest)$/, "");
  if (withoutSuffix !== normalized && map.has(withoutSuffix)) return map.get(withoutSuffix)!;

  // Try broader partial match (substring)
  for (const [key, entry] of map) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return entry;
    }
  }

  return null;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Get the FlavorDB profile for an ingredient.
 * Returns null if the ingredient is not in the flavor dataset.
 */
export async function getFlavorProfile(
  ingredient: string,
): Promise<{ flavordb_id: number; flavordb: string; cosine_similarity: number } | null> {
  const map = await loadFlavorMap();
  const match = findClosestMatch(ingredient, map);
  if (!match) return null;
  return {
    flavordb_id: match.flavordb_id,
    flavordb: match.flavordb,
    cosine_similarity: match.cosine_similarity,
  };
}

/**
 * Compute flavor similarity between two ingredients ∈ [0, 1].
 *
 *  1.0 → same flavor profile (identical flavordb_id)
 *  0.0 → different or unknown profiles
 */
export async function flavorSimilarity(
  ingredientA: string,
  ingredientB: string,
): Promise<number> {
  const map = await loadFlavorMap();
  const a = findClosestMatch(ingredientA, map);
  const b = findClosestMatch(ingredientB, map);

  if (!a || !b) return 0;

  // Same flavor profile → high similarity
  if (a.flavordb_id === b.flavordb_id) {
    // Use the minimum of both cosine similarities as a confidence multiplier
    return Math.min(a.cosine_similarity, b.cosine_similarity);
  }

  return 0;
}

/**
 * Check if a flavor profile is available for an ingredient.
 */
export async function hasFlavorProfile(ingredient: string): Promise<boolean> {
  const map = await loadFlavorMap();
  return findClosestMatch(ingredient, map) !== null;
}
