/**
 * Recipe & Ingredient API Routes
 * ────────────────────────────────
 * Delegates all logic to the service layer.
 * Routes are thin — parse request, call service, return response.
 */

import { Router, type IRouter } from "express";
import {
  db,
  ingredientsTable,
  nutritionTable,
  feedbackTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  AnalyzeRecipeBody,
  AnalyzeRecipeResponse,
  ListIngredientsResponse,
  GetSubstitutesParams,
  GetSubstitutesResponse,
  GetIngredientNutritionParams,
  GetIngredientNutritionResponse,
  SubmitFeedbackBody,
} from "@workspace/api-zod";
import {
  analyzeRecipe,
  getSubstitutesForIngredient,
  normalizeIngredient,
} from "../services";

const router: IRouter = Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function requireDb(res: import("express").Response): boolean {
  if (!db) {
    res.status(503).json({
      error: "Database is currently unavailable. Please ensure DATABASE_URL is configured.",
    });
    return false;
  }
  return true;
}

// ─── POST /analyze-recipe ────────────────────────────────────────────────────

router.post("/analyze-recipe", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;

    const parsed = AnalyzeRecipeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const result = await analyzeRecipe(parsed.data.recipe);

    res.json(AnalyzeRecipeResponse.parse(result));
  } catch (err: any) {
    if (err.message?.includes("Could not parse")) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("ANALYSIS ERROR:", err?.stack ?? err);
    const detail = typeof err?.message === "string" ? err.message : undefined;
    res.status(500).json({
      error: "Internal Server Error",
      ...(process.env.NODE_ENV === "production" ? {} : { detail }),
    });
  }
});

// ─── GET /ingredients ────────────────────────────────────────────────────────

router.get("/ingredients", async (_req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const rows = await db!.select().from(ingredientsTable).orderBy(ingredientsTable.name);
    res.json(ListIngredientsResponse.parse(rows));
  } catch (err) {
    console.error("GET /ingredients ERROR:", err);
    res.status(500).json({ error: "Failed to fetch ingredients" });
  }
});

// ─── GET /ingredients/:name/substitutes ──────────────────────────────────────

router.get("/ingredients/:name/substitutes", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const params = GetSubstitutesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const substitutes = await getSubstitutesForIngredient(params.data.name);
    res.json(GetSubstitutesResponse.parse(substitutes));
  } catch (err) {
    console.error("GET /ingredients/:name/substitutes ERROR:", err);
    res.status(500).json({ error: "Failed to fetch substitutes" });
  }
});

// ─── GET /ingredients/:name/nutrition ────────────────────────────────────────

router.get("/ingredients/:name/nutrition", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const params = GetIngredientNutritionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const normalizedName = await normalizeIngredient(params.data.name);
    const ingRows = await db!.select().from(ingredientsTable).where(sql`lower(${ingredientsTable.name}) = lower(${normalizedName})`);
    const ing = ingRows[0] ?? null;
    if (!ing) {
      res.status(404).json({ error: "Ingredient not found" });
      return;
    }

    const nutRows = await db!.select().from(nutritionTable).where(eq(nutritionTable.ingredientId, ing.id));
    const nut = nutRows[0] ?? null;
    if (!nut) {
      res.status(404).json({ error: "Nutrition data not found" });
      return;
    }

    res.json(GetIngredientNutritionResponse.parse({
      calories: nut.calories, protein: nut.protein, carbs: nut.carbs,
      fat: nut.fat, sugar: nut.sugar, sodium: nut.sodium,
    }));
  } catch (err) {
    console.error("GET /ingredients/:name/nutrition ERROR:", err);
    res.status(500).json({ error: "Failed to fetch nutrition data" });
  }
});

// ─── POST /feedback ──────────────────────────────────────────────────────────

router.post("/feedback", async (req, res): Promise<void> => {
  try {
    if (!requireDb(res)) return;
    const parsed = SubmitFeedbackBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { ingredient, substitute, rating } = parsed.data;
    const [inserted] = await db!
      .insert(feedbackTable)
      .values({ ingredient, substitute, rating })
      .returning({ id: feedbackTable.id });

    res.json({ id: inserted.id, message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("POST /feedback ERROR:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;
