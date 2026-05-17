import { db, brandCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { isBrandedCategory } from "../utils/isBrandedCategory";
import { rankBrands, type RankedProduct, type OpenFoodFactsProduct } from "../utils/rankBrands";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = "v2";
const FETCH_TIMEOUT_MS = 5000;
const MIN_RESULTS = 3;

export interface BrandResult {
  brandable: boolean;
  substituteName: string;
  bestOverall: RankedProduct | null;
  cleanest: RankedProduct | null;
  budget: RankedProduct | null;
}

const UNRELATED_FOOD_WORDS = new Set([
  "chocolate", "candy", "cookie", "cake", "brownie", "muffin", "pastry",
  "pizza", "pasta", "noodle", "bread", "bun", "roll",
  "cracker", "chip", "pretzel", "popcorn",
  "cereal", "granola", "muesli",
  "juice", "soda", "cola", "lemonade",
  "sausage", "bacon", "ham", "patty",
  "curry", "stew", "soup",
]);

function productMatchesQuery(product: OpenFoodFactsProduct, query: string): boolean {
  const q = query.toLowerCase().trim();
  const name = (product.product_name ?? "").toLowerCase().trim();
  if (!name) return false;

  const words = name.split(/[\s,]+/).filter(Boolean);
  const qWords = q.split(/\s+/);

  const nameStartsWithQ = name.startsWith(q);
  const brandHasQ = (product.brands ?? "").toLowerCase().includes(q);
  const catsHaveQ = (product.categories_tags ?? []).join(" ").toLowerCase().includes(q);

  if (nameStartsWithQ || brandHasQ || catsHaveQ) {
    for (const w of words) {
      if (UNRELATED_FOOD_WORDS.has(w) && w !== q && !qWords.includes(w)) return false;
    }
    return true;
  }

  if (words.length <= 4) {
    const nameContainsQ = words.join(" ").includes(q);
    if (nameContainsQ) {
      for (const w of words) {
        if (UNRELATED_FOOD_WORDS.has(w) && w !== q && !qWords.includes(w)) return false;
      }
      return true;
    }
  }

  return false;
}

async function fetchOpenFoodFacts(
  query: string,
  country: "in" | "world"
): Promise<OpenFoodFactsProduct[]> {
  const baseUrl =
    country === "in"
      ? "https://in.openfoodfacts.org"
      : "https://world.openfoodfacts.org";

  const url = `${baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&sort_by=popularity`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [];
    const data = await response.json() as { products?: OpenFoodFactsProduct[] };
    return (data.products ?? []).filter((p) => productMatchesQuery(p, query));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function versionedKey(searchKey: string): string {
  return `${CACHE_VERSION}_${searchKey}`;
}

async function getCached(searchKey: string): Promise<{
  cached: true;
  bestOverall: RankedProduct | null;
  cleanest: RankedProduct | null;
  budget: RankedProduct | null;
} | null> {
  if (!db) return null;
  try {
    const [row] = await db
      .select()
      .from(brandCacheTable)
      .where(eq(brandCacheTable.searchKey, versionedKey(searchKey)))
      .limit(1);

    if (!row) return null;

    const age = Date.now() - new Date(row.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    const data = row.brandsData as unknown as {
      bestOverall: RankedProduct | null;
      cleanest: RankedProduct | null;
      budget: RankedProduct | null;
    };

    return { cached: true, ...data };
  } catch {
    return null;
  }
}

async function setCache(
  searchKey: string,
  data: { bestOverall: RankedProduct | null; cleanest: RankedProduct | null; budget: RankedProduct | null },
  source: string,
  resultCount: number
): Promise<void> {
  if (!db) return;
  try {
    await db
      .insert(brandCacheTable)
      .values({
        searchKey: versionedKey(searchKey),
        brandsData: data as Record<string, unknown>,
        source,
        resultCount,
      })
      .onConflictDoUpdate({
        target: brandCacheTable.searchKey,
        set: {
          brandsData: data as Record<string, unknown>,
          source,
          resultCount,
          fetchedAt: sql`NOW()`,
        },
      });
  } catch {
    // cache write failure is non-critical
  }
}

export async function getBrandRecommendations(
  substituteName: string
): Promise<BrandResult> {
  const result: BrandResult = {
    brandable: false,
    substituteName,
    bestOverall: null,
    cleanest: null,
    budget: null,
  };

  if (!isBrandedCategory(substituteName)) return result;

  const searchKey = substituteName.toLowerCase().trim();

  const cached = await getCached(searchKey);
  if (cached) {
    return { ...result, brandable: true, ...cached };
  }

  let products = await fetchOpenFoodFacts(searchKey, "in");

  let source = "india";
  if (products.length < MIN_RESULTS) {
    const globalProducts = await fetchOpenFoodFacts(searchKey, "world");
    const existingIds = new Set(products.map((p) => p.product_name));
    const deduped = globalProducts.filter((p) => !existingIds.has(p.product_name));
    products = [...products, ...deduped];
    source = products.length >= MIN_RESULTS ? "mixed" : "global";
  }

  if (products.length === 0) return result;

  const ranked = rankBrands(products);
  if (!ranked.bestOverall) return result;

  result.brandable = true;
  result.bestOverall = ranked.bestOverall;
  result.cleanest = ranked.cleanest;
  result.budget = ranked.budget;

  await setCache(searchKey, ranked, source, products.length);

  return result;
}
