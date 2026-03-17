import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ingredientsTable = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
});

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

export const substitutionsTable = pgTable("substitutions", {
  id: serial("id").primaryKey(),
  originalIngredient: text("original_ingredient").notNull(),
  substituteIngredient: text("substitute_ingredient").notNull(),
});

export const diseaseRulesTable = pgTable("disease_rules", {
  id: serial("id").primaryKey(),
  diseaseName: text("disease_name").notNull(),
  restrictedIngredient: text("restricted_ingredient").notNull(),
});

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  ingredient: text("ingredient").notNull(),
  substitute: text("substitute").notNull(),
  rating: integer("rating").notNull(),
});

export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({ id: true });
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredientsTable.$inferSelect;

export const insertNutritionSchema = createInsertSchema(nutritionTable).omit({ id: true });
export type InsertNutrition = z.infer<typeof insertNutritionSchema>;
export type Nutrition = typeof nutritionTable.$inferSelect;

export const insertSubstitutionSchema = createInsertSchema(substitutionsTable).omit({ id: true });
export type InsertSubstitution = z.infer<typeof insertSubstitutionSchema>;

export const insertDiseaseRuleSchema = createInsertSchema(diseaseRulesTable).omit({ id: true });
export type InsertDiseaseRule = z.infer<typeof insertDiseaseRuleSchema>;

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({ id: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
