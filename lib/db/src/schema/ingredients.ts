import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── INGREDIENTS ─────────────────────────────────────────────────────────────

export const ingredientsTable = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  canonicalName: text("canonical_name"),
  category: text("category").notNull(),
  /** e.g. "Sweetener", "Thickener", "Fat Source", "Liquid/Base", "Binder", "Flavor Enhancer", "Protein Source" */
  functionalRole: text("functional_role"),
});

// ─── NUTRITION (per 100 g) ────────────────────────────────────────────────────

export const nutritionTable = pgTable("nutrition", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  sugar: real("sugar"),
  sodium: real("sodium"),
});

// ─── SUBSTITUTIONS ────────────────────────────────────────────────────────────

export const substitutionsTable = pgTable("substitutions", {
  id: serial("id").primaryKey(),
  originalIngredient: text("original_ingredient").notNull(),
  substituteIngredient: text("substitute_ingredient").notNull(),
});

// ─── FEEDBACK ────────────────────────────────────────────────────────────────

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  ingredient: text("ingredient").notNull(),
  substitute: text("substitute").notNull(),
  rating: integer("rating").notNull(),
});

// ─── ZORD INSERT SCHEMAS & TYPES ─────────────────────────────────────────────

export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({ id: true });
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredientsTable.$inferSelect;

export const insertNutritionSchema = createInsertSchema(nutritionTable).omit({ id: true });
export type InsertNutrition = z.infer<typeof insertNutritionSchema>;
export type Nutrition = typeof nutritionTable.$inferSelect;

export const insertSubstitutionSchema = createInsertSchema(substitutionsTable).omit({ id: true });
export type InsertSubstitution = z.infer<typeof insertSubstitutionSchema>;

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({ id: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
