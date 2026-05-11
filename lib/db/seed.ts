/**
 * Database seed — general-purpose ingredient substitution engine.
 * Disease rules table is intentionally NOT seeded.
 */
import { db, ingredientsTable, nutritionTable, substitutionsTable } from "./src/index.ts";

async function seed() {
  console.log("🌱 Seeding database...");
  try {
    // Clear existing data (order matters for FK constraints)
    await db.delete(substitutionsTable);
    await db.delete(nutritionTable);
    await db.delete(ingredientsTable);

    // ── INGREDIENTS ────────────────────────────────────────────────────────────
    console.log("Adding ingredients...");
    const rows = await db.insert(ingredientsTable).values([
      // Sweeteners
      { name: "sugar", category: "pantry", functionalRole: "Sweetener", canonicalName: "sucrose" },
      { name: "stevia", category: "pantry", functionalRole: "Sweetener", canonicalName: "steviol glycosides" },
      { name: "honey", category: "pantry", functionalRole: "Sweetener", canonicalName: "natural honey" },
      { name: "maple syrup", category: "pantry", functionalRole: "Sweetener", canonicalName: "pure maple syrup" },
      { name: "agave syrup", category: "pantry", functionalRole: "Sweetener", canonicalName: "agave nectar" },
      { name: "coconut sugar", category: "pantry", functionalRole: "Sweetener", canonicalName: "coconut palm sugar" },
      // Flours / Thickeners
      { name: "flour", category: "pantry", functionalRole: "Thickener", canonicalName: "wheat flour" },
      { name: "almond flour", category: "pantry", functionalRole: "Thickener", canonicalName: "blanched almond flour" },
      { name: "oat flour", category: "pantry", functionalRole: "Thickener", canonicalName: "whole oat flour" },
      { name: "chickpea flour", category: "pantry", functionalRole: "Thickener", canonicalName: "besan" },
      { name: "cornstarch", category: "pantry", functionalRole: "Thickener", canonicalName: "corn starch" },
      // Fats
      { name: "butter", category: "dairy", functionalRole: "Fat Source", canonicalName: "butter fat" },
      { name: "olive oil", category: "pantry", functionalRole: "Fat Source", canonicalName: "extra virgin olive oil" },
      { name: "coconut oil", category: "pantry", functionalRole: "Fat Source", canonicalName: "virgin coconut oil" },
      { name: "avocado", category: "produce", functionalRole: "Fat Source", canonicalName: "hass avocado" },
      { name: "greek yogurt", category: "dairy", functionalRole: "Fat Source", canonicalName: "strained yogurt" },
      // Dairy / Liquids
      { name: "milk", category: "dairy", functionalRole: "Liquid/Base", canonicalName: "whole milk" },
      { name: "almond milk", category: "pantry", functionalRole: "Liquid/Base", canonicalName: "unsweetened almond milk" },
      { name: "oat milk", category: "pantry", functionalRole: "Liquid/Base", canonicalName: "oat-based milk" },
      { name: "coconut milk", category: "pantry", functionalRole: "Liquid/Base", canonicalName: "full fat coconut milk" },
      { name: "soy milk", category: "pantry", functionalRole: "Liquid/Base", canonicalName: "unsweetened soy milk" },
      // Flavor / Seasoning
      { name: "salt", category: "pantry", functionalRole: "Flavor Enhancer", canonicalName: "sodium chloride" },
      { name: "herbs", category: "pantry", functionalRole: "Flavor Enhancer", canonicalName: "mixed fresh herbs" },
      // Eggs / Binders
      { name: "egg", category: "protein", functionalRole: "Binder", canonicalName: "chicken egg" },
      { name: "flax egg", category: "pantry", functionalRole: "Binder", canonicalName: "ground flaxseed + water" },
      { name: "chia egg", category: "pantry", functionalRole: "Binder", canonicalName: "chia seeds + water" },
      // Proteins
      { name: "chicken breast", category: "protein", functionalRole: "Protein Source", canonicalName: "boneless chicken breast" },
      { name: "tofu", category: "protein", functionalRole: "Protein Source", canonicalName: "firm tofu" },
      { name: "lentils", category: "protein", functionalRole: "Protein Source", canonicalName: "red lentils" },
      { name: "tempeh", category: "protein", functionalRole: "Protein Source", canonicalName: "fermented soy tempeh" },
    ]).returning();

    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));

    // ── NUTRITION (per 100 g) ─────────────────────────────────────────────────
    console.log("Adding nutrition data...");
    await db.insert(nutritionTable).values([
      // Sweeteners
      { ingredientId: byName["sugar"].id, calories: 387, protein: 0, carbs: 100, fat: 0, sugar: 100, sodium: 1 },
      { ingredientId: byName["stevia"].id, calories: 0, protein: 0, carbs: 1, fat: 0, sugar: 0, sodium: 0 },
      { ingredientId: byName["honey"].id, calories: 304, protein: 0.3, carbs: 82, fat: 0, sugar: 82, sodium: 4 },
      { ingredientId: byName["maple syrup"].id, calories: 260, protein: 0, carbs: 67, fat: 0.1, sugar: 60, sodium: 9 },
      { ingredientId: byName["agave syrup"].id, calories: 310, protein: 0.1, carbs: 76, fat: 0.5, sugar: 68, sodium: 4 },
      { ingredientId: byName["coconut sugar"].id, calories: 375, protein: 0, carbs: 92, fat: 0, sugar: 78, sodium: 0 },
      // Flours
      { ingredientId: byName["flour"].id, calories: 364, protein: 10, carbs: 76, fat: 1, sugar: 0, sodium: 2 },
      { ingredientId: byName["almond flour"].id, calories: 571, protein: 21, carbs: 21, fat: 50, sugar: 4, sodium: 1 },
      { ingredientId: byName["oat flour"].id, calories: 404, protein: 15, carbs: 66, fat: 9, sugar: 1, sodium: 2 },
      { ingredientId: byName["chickpea flour"].id, calories: 387, protein: 22, carbs: 58, fat: 6, sugar: 11, sodium: 64 },
      { ingredientId: byName["cornstarch"].id, calories: 381, protein: 0.3, carbs: 91, fat: 0.1, sugar: 0, sodium: 9 },
      // Fats
      { ingredientId: byName["butter"].id, calories: 717, protein: 0.9, carbs: 0.1, fat: 81, sugar: 0.1, sodium: 576 },
      { ingredientId: byName["olive oil"].id, calories: 884, protein: 0, carbs: 0, fat: 100, sugar: 0, sodium: 2 },
      { ingredientId: byName["coconut oil"].id, calories: 862, protein: 0, carbs: 0, fat: 100, sugar: 0, sodium: 0 },
      { ingredientId: byName["avocado"].id, calories: 160, protein: 2, carbs: 9, fat: 15, sugar: 0.7, sodium: 7 },
      { ingredientId: byName["greek yogurt"].id, calories: 97, protein: 9, carbs: 6, fat: 5, sugar: 4, sodium: 47 },
      // Dairy / Liquids
      { ingredientId: byName["milk"].id, calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, sugar: 5.1, sodium: 43 },
      { ingredientId: byName["almond milk"].id, calories: 17, protein: 0.6, carbs: 1.5, fat: 1.1, sugar: 0, sodium: 67 },
      { ingredientId: byName["oat milk"].id, calories: 47, protein: 1, carbs: 8, fat: 1.5, sugar: 3.7, sodium: 52 },
      { ingredientId: byName["coconut milk"].id, calories: 197, protein: 2.3, carbs: 3, fat: 21, sugar: 1, sodium: 13 },
      { ingredientId: byName["soy milk"].id, calories: 33, protein: 3.3, carbs: 2.4, fat: 1.8, sugar: 1, sodium: 51 },
      // Seasoning
      { ingredientId: byName["salt"].id, calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 38758 },
      { ingredientId: byName["herbs"].id, calories: 40, protein: 3, carbs: 6, fat: 1, sugar: 0, sodium: 18 },
      // Eggs / Binders
      { ingredientId: byName["egg"].id, calories: 155, protein: 13, carbs: 1.1, fat: 11, sugar: 1, sodium: 124 },
      { ingredientId: byName["flax egg"].id, calories: 534, protein: 18, carbs: 29, fat: 42, sugar: 1.5, sodium: 30 },
      { ingredientId: byName["chia egg"].id, calories: 486, protein: 17, carbs: 42, fat: 31, sugar: 0, sodium: 16 },
      // Proteins
      { ingredientId: byName["chicken breast"].id, calories: 165, protein: 31, carbs: 0, fat: 3.6, sugar: 0, sodium: 74 },
      { ingredientId: byName["tofu"].id, calories: 76, protein: 8, carbs: 1.9, fat: 4.8, sugar: 0.9, sodium: 7 },
      { ingredientId: byName["lentils"].id, calories: 116, protein: 9, carbs: 20, fat: 0.4, sugar: 1.8, sodium: 2 },
      { ingredientId: byName["tempeh"].id, calories: 193, protein: 19, carbs: 9.4, fat: 11, sugar: 0, sodium: 9 },
    ]);

    // ── SUBSTITUTIONS ─────────────────────────────────────────────────────────
    console.log("Adding substitutions...");
    await db.insert(substitutionsTable).values([
      // Sweetener substitutes
      { originalIngredient: "sugar", substituteIngredient: "stevia" },
      // Flour substitutes
      { originalIngredient: "flour", substituteIngredient: "almond flour" },
      { originalIngredient: "flour", substituteIngredient: "oat flour" },
      { originalIngredient: "flour", substituteIngredient: "chickpea flour" },
      // Fat substitutes
      { originalIngredient: "butter", substituteIngredient: "olive oil" },
      { originalIngredient: "butter", substituteIngredient: "coconut oil" },
      { originalIngredient: "butter", substituteIngredient: "avocado" },
      { originalIngredient: "butter", substituteIngredient: "greek yogurt" },
      // Dairy substitutes
      { originalIngredient: "milk", substituteIngredient: "almond milk" },
      { originalIngredient: "milk", substituteIngredient: "oat milk" },
      { originalIngredient: "milk", substituteIngredient: "soy milk" },
      { originalIngredient: "milk", substituteIngredient: "coconut milk" },
      // Egg/binder substitutes
      { originalIngredient: "egg", substituteIngredient: "flax egg" },
      { originalIngredient: "egg", substituteIngredient: "chia egg" },
      // Protein substitutes
      { originalIngredient: "chicken breast", substituteIngredient: "tofu" },
      { originalIngredient: "chicken breast", substituteIngredient: "tempeh" },
      { originalIngredient: "chicken breast", substituteIngredient: "lentils" },
      // Salt
      { originalIngredient: "salt", substituteIngredient: "herbs" },
    ]);

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit();
  }
}

seed();
