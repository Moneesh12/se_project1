import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  profilePicture: text("profile_picture"),
  dietaryPreferences: text("dietary_preferences").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const favoriteSubstitutesTable = pgTable("favorite_substitutes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),
  substitute: text("substitute").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedRecipesTable = pgTable("saved_recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipeText: text("recipe_text").notNull(),
  resultJson: jsonb("result_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const substitutionHistoryTable = pgTable("substitution_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),
  substitute: text("substitute").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandCacheTable = pgTable("brand_cache", {
  id: serial("id").primaryKey(),
  searchKey: text("search_key").notNull().unique(),
  brandsData: jsonb("brands_data").notNull(),
  source: text("source").notNull(),
  resultCount: integer("result_count").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

export const otpCodesTable = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: text("used").default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
